import { RoutePlanEntity } from '@calo-backend/entities/DDB';
import { RouteItem } from '@calo-backend/interfaces';
import { logger } from '@teamcalo/core';
import { fill, lt, keyBy, filter, some, map, forEach } from 'lodash-es';
import { GetCountryConfigRes, TimeSlotConfig } from 'src/libs/interfaces';

export class AutoSlotAssignmentHelper {
  private static distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static assignBalancedTimeSlots(
    plan: RoutePlanEntity,
    config: GetCountryConfigRes,
    deliveryIds: string[],
    routePlan: Record<string, RouteItem>,
  ): Record<string, RouteItem> {
    const timeConfig = config.delivery?.timings;
    const configSlots = ((timeConfig || []).find((t) => t.id === plan.time)?.slots || []).filter(
      (s: TimeSlotConfig) => s?.enabled,
    );

    if (configSlots.length === 0) return routePlan;

    const items = filter(
      map(deliveryIds, (id) => [id, routePlan[id]] as const),
      ([, rp]) => Boolean(rp),
    );

    const needsAssignment = (rp: RouteItem) => {
      if (!rp?.timeSlot) return true;
      const idx = configSlots.findIndex((s: any) => s.from === rp.timeSlot!.from && s.to === rp.timeSlot!.to);
      return idx === -1; // invalid/unsupported slot
    };

    const hasAnyNeedingAssignment = some(items, ([, rp]) => needsAssignment(rp));
    if (!hasAnyNeedingAssignment) return routePlan;

    const slotCounts = fill(Array.from({ length: configSlots.length }), 0);
    forEach(items, ([, rp]) => {
      const ts = rp?.timeSlot;
      if (ts) {
        const idx = configSlots.findIndex((s: any) => s.from === ts.from && s.to === ts.to);
        if (idx !== -1) slotCounts[idx] += 1;
      }
    });

    const clusterRadiusM = config.delivery?.clusterRadiusM ?? 10;
    const itemMap: Record<string, RouteItem> = Object.fromEntries(items);

    // Build coordinates map and track items with valid coordinates for clustering
    const coordinates = keyBy(
      filter(
        map(items, ([id, rp]) => {
          const lat = rp.origin?.lat;
          const lng = rp.origin?.lng;
          if (typeof lat === 'number' && typeof lng === 'number') {
            return { id, coord: { lat, lng } };
          }
          return null;
        }),
        (item): item is { id: string; coord: { lat: number; lng: number } } => item !== null,
      ),
      'id',
    ) as Record<string, { coord: { lat: number; lng: number } }>;

    // Use Set for O(1) lookups instead of O(n) array includes
    const unvisited = new Set(Object.keys(coordinates));
    const itemsWithCoords = Object.keys(coordinates);

    const clusters: string[][] = [];
    for (const seed of itemsWithCoords) {
      if (!unvisited.has(seed)) continue;
      unvisited.delete(seed);

      const seedCoord = coordinates[seed];
      if (!seedCoord) continue;

      const cluster = [seed];
      const { lat: lat1, lng: lng1 } = seedCoord.coord;

      // Only iterate over remaining unvisited items with valid coordinates
      for (const otherId of unvisited) {
        const coord = coordinates[otherId];
        if (!coord) continue;

        const { lat: lat2, lng: lng2 } = coord.coord;
        const dist = this.distanceMeters(lat1, lng1, lat2, lng2);
        if (dist <= clusterRadiusM) {
          cluster.push(otherId);
          unvisited.delete(otherId);
        }
      }
      clusters.push(cluster);
    }

    const newRoutePlan = { ...routePlan };
    forEach(clusters, (cluster) => {
      const clusterMembers = filter(
        map(cluster, (deliveryId) => [deliveryId, itemMap[deliveryId]] as const),
        ([, rp]) => rp,
      ) as [string, RouteItem][];
      const clusterToAssign = filter(clusterMembers, ([, rp]) => needsAssignment(rp));
      if (clusterToAssign.length === 0) return;

      const counts: Record<number, number> = {};
      forEach(clusterMembers, ([, rp]) => {
        const ts = rp?.timeSlot;
        if (!ts) return;
        const idx = configSlots.findIndex((s: any) => s.from === ts.from && s.to === ts.to);
        if (idx !== -1) counts[idx] = (counts[idx] ?? 0) + 1;
      });

      let chosenIndex = -1;
      let chosenCount = -1;
      forEach(Object.entries(counts), ([idxStr, cnt]) => {
        const idx = Number(idxStr);
        if (cnt > chosenCount) {
          chosenCount = cnt;
          chosenIndex = idx;
        }
      });

      if (chosenIndex === -1) {
        chosenIndex = 0;
        for (let i = 1; i < slotCounts.length; i++) {
          if (lt(slotCounts[i], slotCounts[chosenIndex])) chosenIndex = i;
        }
      }

      forEach(clusterToAssign, ([deliveryId]) => {
        const existing = newRoutePlan[deliveryId];
        if (existing) {
          newRoutePlan[deliveryId] = {
            ...existing,
            timeSlot: { from: configSlots[chosenIndex].from, to: configSlots[chosenIndex].to },
          };
        }
      });
      slotCounts[chosenIndex] += clusterToAssign.length;
    });

    logger.debug('🚀 ~ AutoSlotAssignmentHelper ~ assignBalancedTimeSlots ~ newRoutePlan:', newRoutePlan);
    return newRoutePlan;
  }
}

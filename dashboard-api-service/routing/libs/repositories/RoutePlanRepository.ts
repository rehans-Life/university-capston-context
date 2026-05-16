import { Country, DataType, DeliveryTime } from 'libs/enums';
import { Repository } from 'libs/repositories/DDB';
import { RoutePlanEntity } from '../entities';
import { RouteItem } from '../interfaces';

class RoutePlanRepository extends Repository<RoutePlanEntity> {
  protected dataType = DataType.routePlanNew;
  getEntity(attr: Record<string, unknown>) {
    return new RoutePlanEntity(attr);
  }

  async getDayTimePlans(day: string, time: DeliveryTime) {
    const etities: RoutePlanEntity[] = [];

    const query = this.builder()
      .query()
      .query('id', '=', this.dataType)
      .query('tk', '=', `${day}#${time}`)
      .setIndex('lsi1');

    // console.log(query.build())

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let { Items: rows, LastEvaluatedKey: token } = await this.client.query(query.build()).promise();
      etities.push(...(rows?.map((r) => this.getEntity(r)) ?? []));
      query.setCursor(token!);
      if (!token) {
        break;
      }
    }

    return etities;
  }

  async getByDayIdTime(day: string, driverId: string, time: string) {
    const query = this.builder()
      .query()
      .query('id', '=', this.dataType)
      .query('fk', '=', `${driverId}#${day}#${time}`)
      .setIndex('lsi2');

    let { Items: rows } = await this.client.query(query.build()).promise();
    if (rows && rows[0]) {
      const entity = this.getEntity(rows[0]);
      return entity;
    }
    return null;
  }

  addtoBeDeliveredAtToRoutePlan(routePlanEntity: RoutePlanEntity, calculateFromShiftStart: boolean) {
    const time = new Date(routePlanEntity.day);
    let offset = 0;
    switch (routePlanEntity.country) {
      case Country.BH:
        offset = 3;
        break;
      case Country.SA:
        offset = 3;
        break;
    }
    if (calculateFromShiftStart) {
      time.setHours(
        routePlanEntity.time === DeliveryTime.earlyMorning
          ? 2 - offset
          : routePlanEntity.time === DeliveryTime.morning
            ? 7 - offset
            : 17 - offset
      );
    }

    const rp: Record<string, RouteItem> = {};
    for (const [key, value] of Object.entries(routePlanEntity.routePlan)) {
      time.setSeconds(time.getSeconds() + value.travelTime + 300); //300s -> 5 min buffer for each delivery
      rp[key] = {
        ...value,
        toBeDeliveredAt: time.toISOString()
      };
    }

    return rp;
  }

  // getAfterDate(id: string, startDate: string) {
  //   return this.getBetweenDates(id, startDate, format('yyyy-MM-dd')(addYears(10)(parseISO(startDate))))
  // }
}

export default RoutePlanRepository;

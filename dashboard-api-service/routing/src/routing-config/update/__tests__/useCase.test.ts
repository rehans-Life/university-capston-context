/* eslint-disable @typescript-eslint/no-explicit-any */
// 1. Throws NotFound when routing config doesn't exist
// 2. Preserves next-day booleans when all are true (night shift crossing midnight)
// 3. Preserves next-day booleans when all are false (normal daytime shift)
// 4. Updates next-day booleans from false to true (config changed to cross midnight)
// 5. Updates next-day booleans from true to false (config changed to same day)
// 6. Handles mixed next-day booleans (only shift crosses midnight, delivery doesn't)
// 7. Handles mixed next-day booleans (only delivery crosses midnight, shift doesn't)
// 8. Preserves next-day booleans when update doesn't include them
// 9. Handles partial update — only isDeliveryEndTimeNextDay sent
// 10. Updates all other fields alongside next-day booleans

// Mock the barrel export to avoid circular dependency issues in test environment
jest.mock('libs/entities/DDB', () => {
  const actual = jest.requireActual('libs/entities/DDB/Entity');
  return {
    ...actual,
    Entity: actual.Entity
  };
});

import { Country, DataType, DeliveryTime, Kitchen } from 'libs/enums';
import { RoutingConfigEntity } from 'libs/entities/DDB/RoutingConfigEntity';
import { RoutingConfigRepository } from '../../../../libs/repositories';
import { WindowType } from '../../../../libs/enums';
import { NotFound } from 'http-errors';
import UpdateRoutingConfigUseCase from '../useCase';

/**
 * Helper: builds a RoutingConfigEntity from DynamoDB-like data.
 * This simulates what the repository returns after reading from DDB.
 */
const buildEntity = (overrides: Partial<Record<string, unknown>> = {}) =>
  new RoutingConfigEntity({
    id: DataType.routingConfig,
    sk: 'test-config-id',
    country: Country.BH,
    kitchen: Kitchen.BH1,
    time: DeliveryTime.morning,
    name: 'Test Config',
    enabled: false,
    shiftStartTime: '2026-03-04T04:00:00.000Z',
    shiftEndTime: '2026-03-04T11:30:00.000Z',
    deliveryStartTime: '2026-03-04T05:00:00.000Z',
    deliveryEndTime: '2026-03-04T11:00:00.000Z',
    avgDeliveryTime: 90,
    travelDurationMultiple: 1,
    windowType: WindowType.soft,
    windowSize: 30,
    customDispatchLocation: null,
    autoAssignRoutePlans: false,
    simulationStartTime: '2026-03-04T09:00:00.000Z',
    zoneIds: ['zone-1', 'zone-2'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-04T09:00:00.000Z',
    endAtKitchen: false,
    isDeliveryEndTimeNextDay: false,
    isShiftEndTimeNextDay: false,
    isSubslotTimeNextDay: false,
    ...overrides
  });

describe('UpdateRoutingConfigUseCase', () => {
  let useCase: UpdateRoutingConfigUseCase;
  let mockRoutingConfigRepository: jest.Mocked<RoutingConfigRepository>;

  beforeEach(() => {
    mockRoutingConfigRepository = {
      findById: jest.fn(),
      update: jest.fn()
    } as unknown as jest.Mocked<RoutingConfigRepository>;

    useCase = new UpdateRoutingConfigUseCase(mockRoutingConfigRepository);
    jest.clearAllMocks();
  });

  // --- Basic ---

  it('should throw NotFound when routing config does not exist', async () => {
    // If the config ID doesn't match anything in DDB, we expect a 404.
    mockRoutingConfigRepository.findById.mockResolvedValue(null);

    await expect(useCase.exec({ name: 'Updated' }, 'non-existent-id')).rejects.toThrow(NotFound);
    expect(mockRoutingConfigRepository.findById).toHaveBeenCalledWith('non-existent-id');
  });

  // --- All next-day booleans true ---

  it('should preserve all next-day booleans as true when entity already has them as true', async () => {
    // Scenario: Night shift that crosses midnight. Entity was saved with all next-day = true.
    // We send an unrelated update (e.g. change name). Booleans should stay true.
    const entity = buildEntity({
      shiftStartTime: '2026-03-04T17:00:00.000Z',
      shiftEndTime: '2026-03-04T06:30:00.000Z',
      deliveryStartTime: '2026-03-04T18:00:00.000Z',
      deliveryEndTime: '2026-03-04T06:30:00.000Z',
      firstSubslotEndTime: '2026-03-03T22:30:00.000Z',
      isDeliveryEndTimeNextDay: true,
      isShiftEndTimeNextDay: true,
      isSubslotTimeNextDay: true
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    const result = await useCase.exec({ name: 'Renamed Config' }, 'test-config-id');
    const value = result.valueOf();

    expect(value.isDeliveryEndTimeNextDay).toBe(true);
    expect(value.isShiftEndTimeNextDay).toBe(true);
    expect(value.isSubslotTimeNextDay).toBe(true);
  });

  // --- All next-day booleans false ---

  it('should preserve all next-day booleans as false when entity has them as false', async () => {
    // Scenario: Normal daytime shift (e.g. 04:00 → 11:30 UTC). Nothing crosses midnight.
    // We send an unrelated update. Booleans should stay false.
    const entity = buildEntity({
      shiftStartTime: '2026-03-04T04:00:00.000Z',
      shiftEndTime: '2026-03-04T11:30:00.000Z',
      deliveryStartTime: '2026-03-04T05:00:00.000Z',
      deliveryEndTime: '2026-03-04T11:00:00.000Z',
      isDeliveryEndTimeNextDay: false,
      isShiftEndTimeNextDay: false,
      isSubslotTimeNextDay: false
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    const result = await useCase.exec({ name: 'Still Daytime' }, 'test-config-id');
    const value = result.valueOf();

    expect(value.isDeliveryEndTimeNextDay).toBe(false);
    expect(value.isShiftEndTimeNextDay).toBe(false);
    expect(value.isSubslotTimeNextDay).toBe(false);
  });

  // --- Transition: false → true ---

  it('should update next-day booleans from false to true when config changes to cross midnight', async () => {
    // Scenario: Config was a daytime shift (all false). User changes it to a night shift
    // that crosses midnight. Frontend sends all next-day booleans as true.
    const entity = buildEntity({
      shiftStartTime: '2026-03-04T04:00:00.000Z',
      shiftEndTime: '2026-03-04T11:30:00.000Z',
      deliveryStartTime: '2026-03-04T05:00:00.000Z',
      deliveryEndTime: '2026-03-04T11:00:00.000Z',
      isDeliveryEndTimeNextDay: false,
      isShiftEndTimeNextDay: false,
      isSubslotTimeNextDay: false
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    const result = await useCase.exec(
      {
        shiftStartTime: '2026-03-04T20:00:00.000Z',
        shiftEndTime: '2026-03-04T03:00:00.000Z',
        deliveryStartTime: '2026-03-04T20:00:00.000Z',
        deliveryEndTime: '2026-03-04T02:00:00.000Z',
        firstSubslotEndTime: '2026-03-03T22:00:00.000Z',
        isDeliveryEndTimeNextDay: true,
        isShiftEndTimeNextDay: true,
        isSubslotTimeNextDay: true
      },
      'test-config-id'
    );
    const value = result.valueOf();

    expect(value.isDeliveryEndTimeNextDay).toBe(true);
    expect(value.isShiftEndTimeNextDay).toBe(true);
    expect(value.isSubslotTimeNextDay).toBe(true);
  });

  // --- Transition: true → false ---

  it('should update next-day booleans from true to false when config changes to same day', async () => {
    // Scenario: Config was a night shift (all true). User changes it to a normal daytime shift.
    // Frontend sends all next-day booleans as false.
    const entity = buildEntity({
      shiftStartTime: '2026-03-04T17:00:00.000Z',
      shiftEndTime: '2026-03-04T06:30:00.000Z',
      deliveryStartTime: '2026-03-04T18:00:00.000Z',
      deliveryEndTime: '2026-03-04T06:30:00.000Z',
      isDeliveryEndTimeNextDay: true,
      isShiftEndTimeNextDay: true,
      isSubslotTimeNextDay: true
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    const result = await useCase.exec(
      {
        shiftStartTime: '2026-03-04T04:00:00.000Z',
        shiftEndTime: '2026-03-04T11:30:00.000Z',
        deliveryStartTime: '2026-03-04T05:00:00.000Z',
        deliveryEndTime: '2026-03-04T11:00:00.000Z',
        isDeliveryEndTimeNextDay: false,
        isShiftEndTimeNextDay: false,
        isSubslotTimeNextDay: false
      },
      'test-config-id'
    );
    const value = result.valueOf();

    expect(value.isDeliveryEndTimeNextDay).toBe(false);
    expect(value.isShiftEndTimeNextDay).toBe(false);
    expect(value.isSubslotTimeNextDay).toBe(false);
  });

  // --- Mixed: only shift crosses midnight ---

  it('should handle mixed booleans — only shift crosses midnight, delivery same day', async () => {
    // Scenario: Shift is 20:00→03:00 (crosses midnight), but delivery is 20:00→23:00 (same day).
    // Only isShiftEndTimeNextDay should be true.
    const entity = buildEntity({
      isDeliveryEndTimeNextDay: false,
      isShiftEndTimeNextDay: false,
      isSubslotTimeNextDay: false
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    const result = await useCase.exec(
      {
        shiftStartTime: '2026-03-04T20:00:00.000Z',
        shiftEndTime: '2026-03-04T03:00:00.000Z',
        deliveryStartTime: '2026-03-04T20:00:00.000Z',
        deliveryEndTime: '2026-03-04T23:00:00.000Z',
        firstSubslotEndTime: '2026-03-04T21:30:00.000Z',
        isShiftEndTimeNextDay: true,
        isDeliveryEndTimeNextDay: false,
        isSubslotTimeNextDay: false
      },
      'test-config-id'
    );
    const value = result.valueOf();

    expect(value.isShiftEndTimeNextDay).toBe(true);
    expect(value.isDeliveryEndTimeNextDay).toBe(false);
    expect(value.isSubslotTimeNextDay).toBe(false);
  });

  // --- Mixed: only delivery crosses midnight ---

  it('should handle mixed booleans — only delivery crosses midnight, shift same day', async () => {
    // Scenario: Shift is 22:00→23:30 (same night), but delivery is 22:00→02:00 (next day).
    // Only isDeliveryEndTimeNextDay should be true.
    const entity = buildEntity({
      isDeliveryEndTimeNextDay: false,
      isShiftEndTimeNextDay: false,
      isSubslotTimeNextDay: false
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    const result = await useCase.exec(
      {
        shiftStartTime: '2026-03-04T22:00:00.000Z',
        shiftEndTime: '2026-03-04T23:30:00.000Z',
        deliveryStartTime: '2026-03-04T22:00:00.000Z',
        deliveryEndTime: '2026-03-04T02:00:00.000Z',
        isShiftEndTimeNextDay: false,
        isDeliveryEndTimeNextDay: true,
        isSubslotTimeNextDay: false
      },
      'test-config-id'
    );
    const value = result.valueOf();

    expect(value.isShiftEndTimeNextDay).toBe(false);
    expect(value.isDeliveryEndTimeNextDay).toBe(true);
    expect(value.isSubslotTimeNextDay).toBe(false);
  });

  // --- Mixed: only subslot crosses midnight ---

  it('should handle mixed booleans — only subslot is next day', async () => {
    // Scenario: Shift and delivery are same day, but firstSubslotEndTime falls before delivery start
    // indicating it wraps to the next day. Only isSubslotTimeNextDay should be true.
    const entity = buildEntity({
      isDeliveryEndTimeNextDay: false,
      isShiftEndTimeNextDay: false,
      isSubslotTimeNextDay: false
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    const result = await useCase.exec(
      {
        shiftStartTime: '2026-03-04T18:00:00.000Z',
        shiftEndTime: '2026-03-04T23:00:00.000Z',
        deliveryStartTime: '2026-03-04T18:30:00.000Z',
        deliveryEndTime: '2026-03-04T22:30:00.000Z',
        firstSubslotEndTime: '2026-03-03T20:00:00.000Z',
        isShiftEndTimeNextDay: false,
        isDeliveryEndTimeNextDay: false,
        isSubslotTimeNextDay: true
      },
      'test-config-id'
    );
    const value = result.valueOf();

    expect(value.isShiftEndTimeNextDay).toBe(false);
    expect(value.isDeliveryEndTimeNextDay).toBe(false);
    expect(value.isSubslotTimeNextDay).toBe(true);
  });

  // --- Partial update: booleans not in payload ---

  it('should preserve existing next-day booleans when update payload does not include them', async () => {
    // Scenario: User only updates the name. The next-day booleans should NOT be reset.
    // This was the original bug — class field initializers were overwriting DB values.
    const entity = buildEntity({
      shiftStartTime: '2026-03-04T17:00:00.000Z',
      shiftEndTime: '2026-03-04T06:30:00.000Z',
      deliveryStartTime: '2026-03-04T18:00:00.000Z',
      deliveryEndTime: '2026-03-04T06:30:00.000Z',
      isDeliveryEndTimeNextDay: true,
      isShiftEndTimeNextDay: true,
      isSubslotTimeNextDay: true
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    // Only sending name — no next-day booleans in payload
    const result = await useCase.exec({ name: 'Just a name change' }, 'test-config-id');
    const value = result.valueOf();

    expect(value.isDeliveryEndTimeNextDay).toBe(true);
    expect(value.isShiftEndTimeNextDay).toBe(true);
    expect(value.isSubslotTimeNextDay).toBe(true);
    expect(value.name).toBe('Just a name change');
  });

  // --- Partial update: only one boolean sent ---

  it('should update only isDeliveryEndTimeNextDay when only that boolean is sent', async () => {
    // Scenario: Frontend sends a partial update with only isDeliveryEndTimeNextDay changed.
    // The other two booleans should remain unchanged from the entity.
    const entity = buildEntity({
      isDeliveryEndTimeNextDay: false,
      isShiftEndTimeNextDay: true,
      isSubslotTimeNextDay: true
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    const result = await useCase.exec({ isDeliveryEndTimeNextDay: true }, 'test-config-id');
    const value = result.valueOf();

    expect(value.isDeliveryEndTimeNextDay).toBe(true);
    expect(value.isShiftEndTimeNextDay).toBe(true);
    expect(value.isSubslotTimeNextDay).toBe(true);
  });

  // --- Full update with all fields + booleans ---

  it('should correctly update all fields alongside next-day booleans', async () => {
    // Scenario: A full update where times, zones, cost model AND next-day booleans all change.
    // Verifies booleans don't get lost when many fields are updated together.
    const entity = buildEntity({
      isDeliveryEndTimeNextDay: false,
      isShiftEndTimeNextDay: false,
      isSubslotTimeNextDay: false
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    const result = await useCase.exec(
      {
        name: 'Full Night Update',
        enabled: true,
        shiftStartTime: '2026-03-04T17:00:00.000Z',
        shiftEndTime: '2026-03-04T06:30:00.000Z',
        deliveryStartTime: '2026-03-04T18:00:00.000Z',
        deliveryEndTime: '2026-03-04T06:30:00.000Z',
        avgDeliveryTime: 3600,
        travelDurationMultiple: 1.5,
        windowType: WindowType.hard,
        windowSize: 45,
        endAtKitchen: true,
        autoAssignRoutePlans: true,
        simulationStartTime: '2026-03-04T13:00:00.000Z',
        zoneIds: ['zone-a', 'zone-b', 'zone-c'],
        firstSubslotEndTime: '2026-03-03T22:30:00.000Z',
        costModel: {
          costPerHourAfterSoftEndTime: 0.6,
          costPerHourBeforeSoftStartTime: 0.2,
          globalDurationCostPerHour: 0.1
        },
        isDeliveryEndTimeNextDay: true,
        isShiftEndTimeNextDay: true,
        isSubslotTimeNextDay: true
      },
      'test-config-id'
    );
    const value = result.valueOf();

    expect(value.name).toBe('Full Night Update');
    expect(value.enabled).toBe(true);
    expect(value.windowType).toBe(WindowType.hard);
    expect(value.windowSize).toBe(45);
    expect(value.travelDurationMultiple).toBe(1.5);
    expect(value.endAtKitchen).toBe(true);
    expect(value.autoAssignRoutePlans).toBe(true);
    expect(value.isDeliveryEndTimeNextDay).toBe(true);
    expect(value.isShiftEndTimeNextDay).toBe(true);
    expect(value.isSubslotTimeNextDay).toBe(true);
    expect(value.zoneIds).toEqual(['zone-a', 'zone-b', 'zone-c']);
  });

  // --- Edge case: booleans explicitly set to false in payload ---

  it('should set booleans to false when explicitly sent as false even if entity had true', async () => {
    // Scenario: Entity has all next-day = true. Frontend explicitly sends all as false.
    // This confirms false is treated as a real value, not ignored.
    const entity = buildEntity({
      isDeliveryEndTimeNextDay: true,
      isShiftEndTimeNextDay: true,
      isSubslotTimeNextDay: true
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    const result = await useCase.exec(
      {
        isDeliveryEndTimeNextDay: false,
        isShiftEndTimeNextDay: false,
        isSubslotTimeNextDay: false
      },
      'test-config-id'
    );
    const value = result.valueOf();

    expect(value.isDeliveryEndTimeNextDay).toBe(false);
    expect(value.isShiftEndTimeNextDay).toBe(false);
    expect(value.isSubslotTimeNextDay).toBe(false);
  });

  // --- Verifies repository.update is called with dirty data ---

  it('should mark next-day booleans as dirty when they change', async () => {
    // Scenario: Booleans change from false→true. The dirty tracker should include them
    // so the repository only writes changed fields to DDB.
    const entity = buildEntity({
      isDeliveryEndTimeNextDay: false,
      isShiftEndTimeNextDay: false,
      isSubslotTimeNextDay: false
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    await useCase.exec(
      {
        isDeliveryEndTimeNextDay: true,
        isShiftEndTimeNextDay: true,
        isSubslotTimeNextDay: true
      },
      'test-config-id'
    );

    expect(mockRoutingConfigRepository.update).toHaveBeenCalledTimes(1);
    const updatedEntity = mockRoutingConfigRepository.update.mock.calls[0][0];
    const dirty = updatedEntity.getDirty();

    expect(dirty).toHaveProperty('isDeliveryEndTimeNextDay', true);
    expect(dirty).toHaveProperty('isShiftEndTimeNextDay', true);
    expect(dirty).toHaveProperty('isSubslotTimeNextDay', true);
    expect(dirty).toHaveProperty('updatedAt');
  });

  // --- Booleans unchanged should NOT be dirty ---

  it('should not mark next-day booleans as dirty when they stay the same', async () => {
    // Scenario: Entity has all false, update sends all false.
    // Booleans didn't change so they should NOT appear in dirty.
    const entity = buildEntity({
      isDeliveryEndTimeNextDay: false,
      isShiftEndTimeNextDay: false,
      isSubslotTimeNextDay: false
    });

    mockRoutingConfigRepository.findById.mockResolvedValue(entity);
    mockRoutingConfigRepository.update.mockResolvedValue();

    await useCase.exec(
      {
        name: 'Same booleans',
        isDeliveryEndTimeNextDay: false,
        isShiftEndTimeNextDay: false,
        isSubslotTimeNextDay: false
      },
      'test-config-id'
    );

    const updatedEntity = mockRoutingConfigRepository.update.mock.calls[0][0];
    const dirty = updatedEntity.getDirty();

    expect(dirty).not.toHaveProperty('isDeliveryEndTimeNextDay');
    expect(dirty).not.toHaveProperty('isShiftEndTimeNextDay');
    expect(dirty).not.toHaveProperty('isSubslotTimeNextDay');
    expect(dirty).toHaveProperty('name', 'Same booleans');
  });
});

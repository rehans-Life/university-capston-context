import { MainStackChildScreenProps, ROUTES } from '@navigation/types';

type Props = MainStackChildScreenProps<typeof ROUTES.Deliveries>;

export type DeliveriesNavigationProp = Props['navigation'];
export type DeliveriesRouteProp = Props['route'];

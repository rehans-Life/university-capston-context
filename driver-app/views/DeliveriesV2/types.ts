import { MainStackChildScreenProps, ROUTES } from '@navigation/types';

type Props = MainStackChildScreenProps<typeof ROUTES.DeliveriesV2>;

export type DeliveriesV2NavigationProp = Props['navigation'];
export type DeliveriesV2RouteProp = Props['route'];

import { MainStackChildScreenProps, ROUTES } from '@navigation/types';

type Props = MainStackChildScreenProps<typeof ROUTES.Home>;

export type HomeNavigationProp = Props['navigation'];
export type HomeRouteProp = Props['route'];

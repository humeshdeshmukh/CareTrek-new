// src/types/redux.d.ts
import { RootState as AppRootState } from '../store/store';

declare module 'react-redux' {
  interface DefaultRootState extends AppRootState {}
}
import { firebaseConfig } from './firebase.config';

export const environment = {
  production: false,
  firebase: firebaseConfig,
  maxStudentsPerSession: 10,
  competitionYear: 1446,
};

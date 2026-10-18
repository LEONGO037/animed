export interface Patient {
  id: string;
  name: string;
  email: string;
  statusText?: string;
  lastDoseMg?: number;
  weightKg?: number;
}

export type RootTabParamList = {
  Pacientes: undefined;
  Dashboard: undefined;
  Doctores: undefined;
  'Mi Perfil': undefined;
};

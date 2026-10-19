export type UserRole = 'doctor' | 'patient';

export interface UserProfile {
  id: string;
  role: UserRole;
  username: string;
  first_name: string;
  last_name_p: string;
  last_name_m?: string | null;
  dob?: string | null;
  assigned_doctor_id?: string | null;
  created_at?: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  statusText?: string;
  lastDoseMg?: number;
  weightKg?: number;
}

export interface InjectionRecord {
  id: string;
  patient_id: string;
  injection_date: string;
  dose_mg: number;
  weight_kg: number;
  created_at?: string;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  username: string;
  created_at?: string;
}

export type DoctorsStackParamList = {
  DoctorsList: undefined;
  RegisterDoctor: undefined;
};

export type RootTabParamList = {
  Pacientes: undefined;
  Dashboard: undefined;
  Doctores: undefined;
  'Mi Perfil': undefined;
};

export type PatientTabParamList = {
  'Mi Progreso': undefined;
  'Mi Perfil': undefined;
};

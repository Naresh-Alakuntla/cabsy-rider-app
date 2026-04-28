// Shared auth nav types — unioned routes across both apps.
// Each app registers only the routes its AuthStack uses; rider never
// navigates to DriverOnboarding because the role-aware OtpVerifyScreen
// only fires that branch when appRole === 'driver'.
export type AuthStackParamList = {
  LoginPhone: undefined;
  OtpVerify: { phone: string };
  DriverOnboarding: undefined;
};

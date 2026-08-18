export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  firstName: string;
  lastName: string;
  companyName: string;
  username?: string;
  email: string;
  password: string;
}

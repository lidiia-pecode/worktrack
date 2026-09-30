import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  // One URL: the base of every link and redirect, and the only CORS origin.
  // Stored without a trailing slash so paths can be appended to it.
  frontendUrl: process.env.FRONTEND_URL!.replace(/\/+$/, ''),
}));

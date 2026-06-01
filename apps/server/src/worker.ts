import { app } from "#@/app";

export default {
  fetch(...args: Parameters<typeof app.fetch>) {
    return app.fetch(...args);
  }
};

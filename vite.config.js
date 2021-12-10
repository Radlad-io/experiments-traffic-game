const { resolve } = require("path");
const { defineConfig } = require("vite");

module.exports = defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        car: resolve(__dirname, "helpers/car/index.html"),
        spotlight: resolve(__dirname, "helpers/spotlight/index.html"),
        lights: resolve(__dirname, "helpers/lights/index.html"),
      },
    },
  },
});

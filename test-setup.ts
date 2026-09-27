import { plugin } from "bun";

plugin({
  name: "sql-loader",
  setup(build) {
    build.onLoad({ filter: /\.sql$/ }, async (args) => {
      const text = await Bun.file(args.path).text();
      return {
        contents: `export default ${JSON.stringify(text)};`,
        loader: "js",
      };
    });
    build.onLoad({ filter: /@rn-primitives.*\.m?js$/ }, async (args) => {
      const text = await Bun.file(args.path).text();
      return {
        contents: text,
        loader: "jsx",
      };
    });
  },
});

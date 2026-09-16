// @ts-check
import eslintConfigPrettier from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
	{
		files: ["**/*.{js,mjs,cjs,ts,vue}"],
		plugins: { prettier },
		rules: {
			"prettier/prettier": ["error", { useTabs: true, tabWidth: 4, printWidth: 200 }],
			quotes: ["error", "double"],
			indent: ["error", "tab"],
		},
	},
	eslintConfigPrettier
);

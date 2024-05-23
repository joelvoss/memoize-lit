import jvdxConfig from '@jvdx/eslint-config';

export default [
	jvdxConfig.configs.typescript,
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 0
		}
	}
];
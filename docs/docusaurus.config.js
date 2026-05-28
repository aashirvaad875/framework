// @ts-check
const { themes } = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '@framework/core',
  tagline: 'Enterprise TypeScript Framework for Node.js',
  favicon: 'img/favicon.ico',

  url: 'https://framework.whatworks.com.au',
  baseUrl: '/',
  organizationName: 'framework',
  projectName: 'core',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/framework/core/tree/main/docs',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    image: 'img/social-card.jpg',
    navbar: {
      title: '@framework/core',
      logo: {
        alt: 'Framework Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/framework/core',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started' },
            { label: 'Architecture', to: '/docs/architecture' },
            { label: 'API Reference', to: '/docs/api/application' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub Discussions', href: 'https://github.com/framework/core/discussions' },
            { label: 'GitHub Issues', href: 'https://github.com/framework/core/issues' },
          ],
        },
        {
          title: 'Resources',
          items: [
            { label: 'Examples', to: '/docs/examples' },
            { label: 'Recipes', to: '/docs/recipes' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} @framework/core. Built with Docusaurus.`,
    },
    prism: {
      theme: themes.github,
      darkTheme: themes.dracula,
      additionalLanguages: ['typescript', 'bash', 'json', 'yaml'],
    },
  },

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [],
      },
    ],
  ],
};

module.exports = config;

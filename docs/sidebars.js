const sidebars = {
  docsSidebar: [
    'intro',
    {
      label: 'Foundations',
      items: [
        'foundations/getting-started',
        'foundations/installation',
        'foundations/your-first-api',
        'foundations/project-structure',
        'foundations/architecture-overview',
        'foundations/request-lifecycle',
      ],
    },
    {
      label: 'Core Concepts',
      items: [
        'core-concepts/modules',
        'core-concepts/module-loading',
        'core-concepts/dependency-injection',
        'core-concepts/scopes',
        'core-concepts/decorators',
        'core-concepts/decorators-reference',
      ],
    },
    {
      label: 'Building Applications',
      items: [
        'building-apps/controllers-routing',
        'building-apps/error-handling',
        'building-apps/authentication',
        'building-apps/unit-testing',
        'building-apps/integration-testing',
        'building-apps/e2e-testing',
      ],
    },
    {
      label: 'Production Ready',
      items: [
        'production/deployment-overview',
        'production/docker',
        'production/kubernetes',
        'production/cloud-platforms',
        'production/performance',
        'production/monitoring',
        'production/security',
      ],
    },
    {
      label: 'Extensibility',
      items: [
        'extensibility/plugins',
        'extensibility/custom-decorators',
        'extensibility/contributing',
      ],
    },
    {
      label: 'Examples & Recipes',
      items: [
        'examples/todo-api',
        'examples/auth-system',
        'examples/realtime-chat',
        'examples/file-uploads',
        'examples/admin-dashboard',
        'recipes/common-patterns',
        'recipes/troubleshooting',
        'recipes/performance-tips',
        'recipes/security-checklist',
      ],
    },
    {
      label: 'API Reference',
      items: [
        'api/application',
        'api/modules',
        'api/decorators',
        'api/dependency-injection',
        'api/error-handling',
        'api/events',
        'api/plugins',
      ],
    },
  ],
};

module.exports = sidebars;

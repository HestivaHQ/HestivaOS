#!/usr/bin/env python3
import importlib.util
import os
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name('validate_documentation.py')
spec = importlib.util.spec_from_file_location('validate_documentation', MODULE_PATH)
validator = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(validator)


class DocumentationImpactTests(unittest.TestCase):
    def test_parse_complete_declaration(self):
        body = '''
## Documentation impact
- Architecture/component boundary: NO
- Domain/business behavior: NO
- Security/privacy/auth: NO
- Database/schema/migration: YES
- Deployment/runtime configuration: NO
- Recovery/incident procedure: NO
- Roadmap/planned state: NO
- Cross-system contract: NO
- Durable decision: YES
- Repository/CI workflow: NO
- Changelog significance: SECURITY
- Documentation companions: docs/DOMAIN.md, docs/CHANGELOG.md
- Coordination source: NONE
'''
        fields, changelog, companions, coordination = validator.parse_pr_body(body)
        self.assertEqual(fields['Database/schema/migration'], 'YES')
        self.assertEqual(fields['Durable decision'], 'YES')
        self.assertEqual(changelog, 'SECURITY')
        self.assertEqual(companions, 'docs/DOMAIN.md, docs/CHANGELOG.md')
        self.assertEqual(coordination, 'NONE')

    def test_infers_database_from_prisma_and_migration(self):
        impacts = validator.inferred_impacts([
            'apps/api/prisma/schema.prisma',
            'apps/api/prisma/migrations/20260820000000_example/migration.sql',
        ])
        self.assertIn('Database/schema/migration', impacts)

    def test_infers_repository_ci_from_workflow_and_validator(self):
        impacts = validator.inferred_impacts([
            '.github/workflows/pr-quality-gates.yml',
            'scripts/validate_documentation.py',
        ])
        self.assertIn('Repository/CI workflow', impacts)

    def test_infers_security_only_for_high_confidence_paths(self):
        self.assertIn('Security/privacy/auth', validator.inferred_impacts(['apps/api/src/auth/auth.service.ts']))
        self.assertNotIn('Security/privacy/auth', validator.inferred_impacts(['apps/api/src/users/users.service.ts']))

    def test_infers_cross_system_for_integration_adapter_paths(self):
        self.assertIn('Cross-system contract', validator.inferred_impacts(['apps/api/src/integrations/website.controller.ts']))
        self.assertIn('Cross-system contract', validator.inferred_impacts(['apps/api/src/messaging/adapters/whatsapp.ts']))

    def test_companion_parser(self):
        self.assertEqual(
            validator.companion_paths('docs/ARCHITECTURE.md, `docs/ROADMAP.md`'),
            {'docs/ARCHITECTURE.md', 'docs/ROADMAP.md'},
        )
        self.assertEqual(validator.companion_paths('NONE'), set())


if __name__ == '__main__':
    unittest.main()

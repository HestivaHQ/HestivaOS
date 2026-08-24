import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from '@jest/globals';

type ContractField = {
  id: string;
  type: string;
  options?: string[];
  requiredWhen?: string;
  visibleWhen?: string;
};
type ContractScreen = { id: string; fields: ContractField[] };
type FlowComponent = Record<string, unknown> & { type?: string; name?: string };

const root = resolve(__dirname, '../../../../');
const contract = JSON.parse(
  readFileSync(resolve(root, 'docs/contracts/HOMENT_QUOTE_REQUEST_V1.json'), 'utf8'),
) as {
  contractId: string;
  flowJsonVersion: string;
  mappingVersion: string;
  completionVersion: string;
  screens: ContractScreen[];
};

function buildArtifact() {
  const stdout = execFileSync(
    'python3',
    [resolve(root, 'scripts/generate_whatsapp_quote_flow_v1_non_photo.py')],
    { cwd: root, encoding: 'utf8' },
  );
  return JSON.parse(stdout) as {
    version: string;
    screens: Array<{ id: string; layout: unknown }>;
  };
}

function components(value: unknown): FlowComponent[] {
  if (Array.isArray(value)) return value.flatMap(components);
  if (!value || typeof value !== 'object') return [];
  const object = value as Record<string, unknown>;
  const current = typeof object.type === 'string' ? [object as FlowComponent] : [];
  return current.concat(
    Object.entries(object)
      .filter(([key]) => !['data-source', 'on-click-action', 'on-select-action', 'on-unselect-action'].includes(key))
      .flatMap(([, child]) => components(child)),
  );
}

function namedComponents(flow: ReturnType<typeof buildArtifact>) {
  const result = new Map<string, FlowComponent>();
  for (const screen of flow.screens) {
    for (const component of components(screen.layout)) {
      if (component.name && component.type !== 'Form') result.set(component.name, component);
    }
  }
  return result;
}

describe('HOMENT_QUOTE_REQUEST_V1 non-photo Meta artifact', () => {
  it('keeps the frozen eight screens, versions and all non-photo machine field IDs', () => {
    const flow = buildArtifact();
    expect(flow.version).toBe('7.3');
    expect(contract.contractId).toBe('HOMENT_QUOTE_REQUEST_V1');
    expect(contract.mappingVersion).toBe('HOMENT_QUOTE_REQUEST_MAPPING_V1');
    expect(contract.completionVersion).toBe('HOMENT_QUOTE_REQUEST_COMPLETION_V1');
    expect(flow.screens.map((screen) => screen.id)).toEqual([
      'YOUR_HOME',
      'CLEANING_REQUIREMENTS',
      'PERSONALISE_SERVICE',
      'PREFERRED_VISIT',
      'ACCESS_HOUSEHOLD',
      'PHOTOS_NOTES',
      'YOUR_DETAILS',
      'REVIEW_SUBMIT',
    ]);

    const expected = contract.screens.flatMap((screen) => screen.fields.map((field) => field.id)).filter((id) => id !== 'quote_photos').sort();
    const actual = [...namedComponents(flow).keys()].sort();
    expect(actual).toEqual(expected);
    expect(JSON.stringify(flow)).not.toContain('PhotoPicker');
    expect(JSON.stringify(flow)).not.toContain('quote_photos');
    expect(JSON.stringify(flow)).not.toContain('resolved_frequency');
  });

  it('keeps every frozen option ID on the matching generated component', () => {
    const flow = buildArtifact();
    const byName = namedComponents(flow);
    for (const screen of contract.screens) {
      for (const field of screen.fields) {
        if (field.id === 'quote_photos' || !field.options) continue;
        const component = byName.get(field.id) as { 'data-source'?: Array<{ id: string }> } | undefined;
        expect(component).toBeDefined();
        expect(component?.['data-source']?.map((option) => option.id)).toEqual(field.options);
      }
    }
  });

  it('uses the frozen completion metadata and exact non-photo completion field set', () => {
    const flow = buildArtifact();
    const review = flow.screens.find((screen) => screen.id === 'REVIEW_SUBMIT');
    const footer = components(review?.layout).find((component) => component.type === 'Footer') as {
      'on-click-action'?: { name?: string; payload?: Record<string, unknown> };
    } | undefined;
    expect(footer?.['on-click-action']?.name).toBe('complete');
    const payload = footer?.['on-click-action']?.payload ?? {};
    expect(payload.homent_contract).toBe('HOMENT_QUOTE_REQUEST_V1');
    expect(payload.homent_mapping_version).toBe('HOMENT_QUOTE_REQUEST_MAPPING_V1');
    expect(payload.homent_completion_version).toBe('HOMENT_QUOTE_REQUEST_COMPLETION_V1');

    const expectedBusinessFields = contract.screens.flatMap((screen) => screen.fields.map((field) => field.id)).filter((id) => id !== 'quote_photos').sort();
    const actualBusinessFields = Object.keys(payload).filter((key) => !key.startsWith('homent_')).sort();
    expect(actualBusinessFields).toEqual(expectedBusinessFields);
  });

  it('keeps PhotoPicker disabled without removing the frozen future photo contract', () => {
    const photoField = contract.screens.find((screen) => screen.id === 'PHOTOS_NOTES')?.fields.find((field) => field.id === 'quote_photos');
    expect(photoField?.type).toBe('PhotoPicker');
    const flow = buildArtifact();
    const photoScreen = flow.screens.find((screen) => screen.id === 'PHOTOS_NOTES');
    expect(components(photoScreen?.layout).some((component) => component.type === 'PhotoPicker')).toBe(false);
  });
});

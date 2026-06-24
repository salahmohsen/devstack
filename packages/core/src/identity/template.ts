export const IDENTITY_WORKING_MEMORY_TEMPLATE = `# Identity (Salah Mohsen)

The following is the current state of the portfolio owner's self-description facets.
Refer to the user in the third person. Use these to ground content suggestions, but
do not invent new facts beyond what is here.

## Headline
{{#if headline}}{{oneLiner}}{{else}}_not set_{{/if}}
{{#if valueProps}}- {{valueProps}}{{/if}}

## Bio
{{#if bio.short}}{{bio.short}}{{else}}_not set_{{/if}}
{{#if bio.long}}{{bio.long}}{{/if}}

## Focus log (reverse chronological)
{{#each focus_log.items}}- ({{startedAt}}) **{{title}}** — {{body}}
{{/each}}
{{#unless focus_log.items}}_no focus log items yet_{{/unless}}

## Narrative
{{#if narrative.text}}{{narrative.text}}{{else}}_not set_{{/if}}
`;

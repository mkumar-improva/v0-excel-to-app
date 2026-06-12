/**
 * Parallel Web Search Service — Task API
 * Docs: https://docs.parallel.ai/task-api/task-quickstart
 *
 * Flow:
 *   1. enhancedSearch(userPrompt) is called from search.routes.js
 *   2. userPrompt is parsed into structured fields and fed into buildPrompt()
 *   3. The filled prompt is the ONLY input sent to the Parallel Task API
 *   4. The API returns output.content (business_input) + output.basis (citations)
 *   5. Evidence array is reconstructed from content.evidence (schema output) and
 *      supplemented/enriched from basis[] (citation-level provenance)
 *   6. finalResult = { business_input, evidence[] } is returned as formattedText (JSON)
 *   7. route.ts builds the Gemini enhanced prompt:
 *        ORIGINAL BUSINESS INPUT + STRUCTURED EVIDENCE → Gemini → validation JSON
 */

// Prompt Template
const DEFAULT_PROMPT_TEMPLATE = `You are a business verification agent. Your job is to find and return structured evidence from at least 8–10 DISTINCT public web sources for the given US business.

INPUT BUSINESS:
Name: {{Name}}
Facility Type: {{Facility Type}}
Address: {{Address}}
City: {{City}}
State: {{State}}
Zip: {{Zip}}
Telephone: {{Telephone}}
Fax: {{Fax}}

MANDATORY SEARCH QUERIES — execute ALL of these searches before responding:
1. "{{Name}}" "{{Address}}" official website
2. "{{Name}}" "{{Address}}"
3. "{{Name}}" "{{Address}}" phone address
4. "{{Name}}" site:yelp.com OR site:bbb.org
5. "{{Name}}" site:healthgrades.com OR site:caring.com OR site:seniorly.com
6. "{{Name}}" "{{Address}}" site:yellowpages.com OR site:superpages.com
7. "{{Name}}" NPI registry OR IDPH OR Illinois assisted living license
8. "{{Name}}" "{{Address}}" Google Maps OR Google Business

SOURCE TRUST PRIORITY (high → low):
1. Official Website  — business owns the domain; has contact/location page
2. Google Business Profile
3. Google Maps
4. BBB
5. Yelp / Healthgrades / Zocdoc / Caring / Seniorly / Directories
6. NPI Registry
7. Government / Secretary of State Registries (treat as historical only)

CRITICAL RULES:
- You MUST visit and extract data from AT LEAST 8 distinct URLs before writing output.
- Each evidence item must come from a different domain.
- OFFICIAL WEBSITE RULE — ONLY ONE domain can be is_official_website=true. It must be a domain the
  business itself owns (their own .com/.org/.net). If you are uncertain, set is_official_website=false.
- NEVER mark yelp.com, bbb.org, google.com, facebook.com, linkedin.com, healthgrades.com,
  zocdoc.com, yellowpages.com, mapquest.com, seniorly.com, caring.com, aplaceformom.com,
  npiregistry.cms.hhs.gov, npidb.org, npino.com, or any government/SoS site as is_official_website=true.
- Government and NPI data may be outdated — flag with source_type "Government Registry" or "NPI Registry".
- Match the specific branch/location address, NOT corporate headquarters.
- Normalize addresses: St=Street, Ave=Avenue, Rd=Road, Blvd=Boulevard. Ignore suite differences.
- Normalize phones: strip dashes, spaces, parentheses, country codes.
- Extract supporting_excerpt: copy the exact sentence(s) showing name + address + phone from the page.
- Set confidence: 0.9 = name+address+phone all match input; 0.6 = partial match; 0.3 = name only.
- If a field is not found on that page, return "" for that field — do not copy from other sources.

OUTPUT: Return ONLY valid JSON matching this exact schema. No markdown. No explanation.
{
  "business_input": {
    "name": "string", "facility_type": "string", "address": "string",
    "city": "string", "state": "string", "zip": "string",
    "telephone": "string", "fax": "string"
  },
  "evidence": [
    {
      "source_type": "Official Website | Google Business Profile | Google Maps | BBB | Directory | NPI Registry | Government Registry | Social Media | Unknown",
      "domain": "string",
      "url": "string",
      "is_official_website": false,
      "business_name_found": "string",
      "address_found": "string",
      "phone_found": "string",
      "fax_found": "string",
      "confidence": 0.0,
      "supporting_excerpt": "string"
    }
  ]
}
MINIMUM evidence array length: 8 items. If fewer than 8 distinct sources exist, include every source found maximum 10 items.`;

// Domains that are NEVER the official business website.
const NON_OFFICIAL_DOMAINS = [
    'yelp.com', 'bbb.org', 'google.com', 'facebook.com',
    'linkedin.com', 'healthgrades.com', 'zocdoc.com',
    'yellowpages.com', 'mapquest.com',
    'npiregistry.cms.hhs.gov', 'npidb.org', 'npino.com',
    'twitter.com', 'instagram.com',
    // Directories / aggregators
    'seniorly.com', 'caring.com', 'aplaceformom.com', 'senioradvisor.com',
    'medicare.gov', 'medicaid.gov', 'cms.gov',
    'vitals.com', 'ratemds.com', 'webmd.com',
    'angieslist.com', 'homeadvisor.com', 'thumbtack.com',
    'manta.com', 'citysearch.com', 'superpages.com',
    'whitepages.com', 'spokeo.com', 'intelius.com',
    'bizapedia.com', 'opencorporates.com', 'dnb.com',
];

// Parallel Task API output schema.
const TASK_OUTPUT_SCHEMA = {
    type: 'json',
    json_schema: {
        type: 'object',
        properties: {
            business_input: {
                type: 'object',
                properties: {
                    name:          { type: 'string' },
                    facility_type: { type: 'string' },
                    address:       { type: 'string' },
                    city:          { type: 'string' },
                    state:         { type: 'string' },
                    zip:           { type: 'string' },
                    telephone:     { type: 'string' },
                    fax:           { type: 'string' }
                },
                required: ['name', 'facility_type', 'address', 'city', 'state', 'zip', 'telephone', 'fax'],
                additionalProperties: false
            },
            evidence: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        url:                 { type: 'string' },
                        business_name_found: { type: 'string' },
                        address_found:       { type: 'string' },
                        phone_found:         { type: 'string' },
                        fax_found:           { type: 'string' },
                        confidence:          { type: 'number' },
                        supporting_excerpt:  { type: 'string' }
                    },
                    required: ['url', 'business_name_found', 'address_found', 'phone_found', 'confidence', 'supporting_excerpt'],
                    additionalProperties: false
                }
            }
        },
        required: ['business_input', 'evidence'],
        additionalProperties: false
    }
};

// Helpers

/**
 * Fill DEFAULT_PROMPT_TEMPLATE placeholders with business field values.
 * @param {Object} fields - { name, facilityType, address, city, state, zip, telephone, fax }
 * @returns {string} Filled prompt ready to send to the Task API
 */
function buildPrompt(fields) {
    const {
        name = '', facilityType = '', address = '', city = '',
        state = '', zip = '', telephone = '', fax = ''
    } = fields;
    return DEFAULT_PROMPT_TEMPLATE
        .replace(/{{Name}}/g,          name)
        .replace(/{{Facility Type}}/g, facilityType)
        .replace(/{{Address}}/g,       address)
        .replace(/{{City}}/g,          city)
        .replace(/{{State}}/g,         state)
        .replace(/{{Zip}}/g,           zip)
        .replace(/{{Telephone}}/g,     telephone)
        .replace(/{{Fax}}/g,           fax);
}

/**
 * Parse a raw "Key: Value" line string into structured fields for buildPrompt.
 * Also accepts a plain object (pass-through with key normalization).
 * @param {string|Object} input
 * @returns {{ name, facilityType, address, city, state, zip, telephone, fax }}
 */
function parseBusinessInput(input) {
    if (input && typeof input === 'object') {
        return {
            name:         input.name          || input.Name          || '',
            facilityType: input.facility_type || input['Facility Type'] || '',
            address:      input.address       || input.Address       || '',
            city:         input.city          || input.City          || '',
            state:        input.state         || input.State         || '',
            zip:          input.zip           || input.Zip           || '',
            telephone:    input.telephone     || input.Telephone     || '',
            fax:          input.fax           || input.Fax           || '',
        };
    }
    const get = (key) => {
        const m = String(input).match(new RegExp(key + '\\s*:\\s*(.+)', 'i'));
        return m ? m[1].trim() : '';
    };
    return {
        name:         get('Name'),
        facilityType: get('Facility Type'),
        address:      get('Address'),
        city:         get('City'),
        state:        get('State'),
        zip:          get('Zip'),
        telephone:    get('Telephone'),
        fax:          get('Fax'),
    };
}

/**
 * Derive a source_type label from a URL + domain.
 * @param {string} url
 * @param {string} domain
 * @returns {string}
 */
function deriveSourceType(url, domain) {
    if (domain.includes('bbb.org'))    return 'BBB';
    if (domain.includes('google.com') && url.includes('maps')) return 'Google Maps';
    if (domain.includes('google.com')) return 'Google Business Profile';
    if (domain.includes('npi'))        return 'NPI Registry';
    if (domain.includes('.gov'))       return 'Government Registry';
    if (['facebook.com', 'linkedin.com', 'twitter.com', 'instagram.com'].some(d => domain.includes(d))) {
        return 'Social Media';
    }
    // Only label as Official Website if the domain is NOT in any known non-official list.
    // Unknown/unrecognised directories default to 'Directory' — the caller enforces single official.
    if (!NON_OFFICIAL_DOMAINS.some(d => domain.includes(d))) return 'Official Website';
    return 'Directory';
}

/**
 * Sort-order weight for evidence items — lower number = higher priority.
 * @param {string} source_type
 * @returns {number}
 */
function sourcePriority(source_type) {
    const ORDER = {
        'Official Website':       1,
        'Google Business Profile': 2,
        'Google Maps':            3,
        'BBB':                    4,
        'Directory':              5,
        'Social Media':           6,
        'NPI Registry':           7,
        'Government Registry':    8,
        'Unknown':                9,
    };
    return ORDER[source_type] ?? 10;
}

/**
 * Strip markdown link syntax "[label](url)" returning only the raw URL.
 * @param {string} raw
 * @returns {string}
 */
function cleanUrl(raw) {
    if (!raw || typeof raw !== 'string') return raw || '';
    const md = raw.match(/\[.*?\]\((https?:\/\/[^)]+)\)/);
    return md ? md[1].trim() : raw.trim();
}

/**
 * Safely extract the hostname (without leading "www.") from a URL.
 * @param {string} url
 * @returns {string}
 */
function safeHostname(url) {
    try {
        return new URL(cleanUrl(url)).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

/**
 * Build a normalized address string from a businessInput object.
 * @param {Object} b
 * @returns {string}
 */
function buildAddress(b) {
    return [b.address, b.city, b.state, b.zip].filter(Boolean).join(', ');
}

// Core: enhancedSearch

/**
 * Perform enhanced search using the Parallel Task API.
 *
 * INPUT CONTRACT:
 *   userPrompt — any of:
 *     • Plain "Key: Value" text (e.g. "Name: Sunrise Care\nAddress: 123 Main")
 *     • A structured JS object with business fields
 *   The prompt is parsed → buildPrompt() fills the template → ONLY that filled
 *   prompt is sent to Parallel. No other content is added.
 *
 * OUTPUT CONTRACT:
 *   Returns { formattedText, rawResults, queries }
 *   formattedText = JSON.stringify({ business_input, evidence[] })
 *
 * @param {string|Object} userPrompt
 * @returns {Promise<{ formattedText: string, rawResults: Object, queries: string[] }>}
 */
async function enhancedSearch(userPrompt) {
    const apiKey = process.env.PARALLEL_API_KEY;
    if (!apiKey) {
        throw new Error('PARALLEL_API_KEY is not configured in environment variables');
    }

    // 1. Build the prompt — ONLY input sent to Parallel
    const fields      = parseBusinessInput(userPrompt);
    const taskInput   = buildPrompt(fields);

    console.log(`🚀 Starting Parallel Task Run for: "${fields.name}" (${fields.city}, ${fields.state})`);
    const startTime   = Date.now();

    // 2. Create the Task Run
    const createResponse = await fetch('https://api.parallel.ai/v1/tasks/runs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key':    apiKey
        },
        body: JSON.stringify({
            input:     taskInput,       
            processor: 'base-fast',
            task_spec: {
                output_schema: TASK_OUTPUT_SCHEMA
            }
        })
    });
    // console.log("Task run created", taskInput);


    if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Parallel Task API creation error (${createResponse.status}): ${errorText}`);
    }

    const taskData = await createResponse.json();
    const runId    = taskData.run_id;

    if (!runId) {
        throw new Error('Failed to create task run: run_id is missing in response');
    }

    console.log(`⏳ Task run created. Run ID: ${runId}. Waiting for result (blocking)...`);

    // 3. Wait for result (blocking GET — Parallel holds connection until done)
    const resultResponse = await fetch(
        `https://api.parallel.ai/v1/tasks/runs/${runId}/result`,
        {
            method:  'GET',
            headers: { 'x-api-key': apiKey }
        }
    );

    if (!resultResponse.ok) {
        const errorText = await resultResponse.text();
        throw new Error(`Failed to retrieve task result (${resultResponse.status}): ${errorText}`);
    }

    const resultData = await resultResponse.json();
    const duration   = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Parallel Task Run completed in ${duration}s`);

    // 4. Unwrap the API response (handles various shapes)
    const output       = resultData.output ?? resultData.result?.output ?? resultData.result;
    const basis        = resultData.basis  ?? resultData.result?.basis  ?? output?.basis;
    const content      = output?.content   ?? output;
    const businessInput = content?.business_input ?? {};

    // 5. Reconstruct evidence array

    const urlMap = new Map();

    /**
     * Upsert an evidence item keyed by cleaned URL.
     * @param {string} rawUrl
     * @param {Object} overrides
     */
    function upsertEvidence(rawUrl, overrides = {}) {
        const url    = cleanUrl(rawUrl);
        if (!url) return;
        const domain = safeHostname(url);
        const isOff  = !NON_OFFICIAL_DOMAINS.some(d => domain.includes(d));

        if (!urlMap.has(url)) {
            urlMap.set(url, {
                source_type:         deriveSourceType(url, domain),
                domain,
                url,
                is_official_website: isOff,
                business_name_found: '',
                address_found:       '',
                phone_found:         '',
                fax_found:           '',
                confidence:          0.6,
                supporting_excerpt:  ''
            });
        }

        const item = urlMap.get(url);
        for (const [key, value] of Object.entries(overrides)) {
            if (
                value !== undefined &&
                value !== null &&
                value !== ''
            ) {
                item[key] = value;
            }
        }
        // Always re-derive is_official_website from source_type
        item.is_official_website = item.source_type === 'Official Website';
    }

    // Priority 1 — evidence array from schema output (if present)
    const rawEvidence = content?.evidence;
    if (Array.isArray(rawEvidence) && rawEvidence.length > 0) {
        for (const ev of rawEvidence) {
            if (!ev.url) continue;
            const url     = cleanUrl(ev.url);
            const domain  = safeHostname(url);
            const srcType = deriveSourceType(url, domain);

            upsertEvidence(url, {
                source_type:         srcType,
                domain,
                url,
                is_official_website: srcType === 'Official Website',
                business_name_found: ev.business_name_found || '',
                address_found:       ev.address_found || '',
                phone_found:         ev.phone_found || '',
                fax_found:           ev.fax_found || '',
                confidence:          typeof ev.confidence === 'number' ? ev.confidence : 0.6,
                supporting_excerpt:  ev.supporting_excerpt || ''
            });
        }
    }

    // Priority 2 — basis citations (primary provenance source from Parallel)
    if (Array.isArray(basis)) {
        for (const fieldBasis of basis) {
            const confidenceStr = (fieldBasis.confidence ?? 'low').toLowerCase();
            const confidenceNum = confidenceStr === 'high'   ? 0.9
                                : confidenceStr === 'medium' ? 0.6
                                : 0.3;
            const excerptText = (fieldBasis.excerpts ?? [])
                .map(e => (typeof e === 'string' ? e : (e?.text ?? '')))
                .join('\n')
                .trim();

            for (const cit of (fieldBasis.citations ?? [])) {
                const rawUrl = (typeof cit === 'string' ? cit : cit?.url) ?? '';
                if (!rawUrl) continue;
                upsertEvidence(rawUrl, {
                    confidence:         confidenceNum,
                    supporting_excerpt: excerptText || urlMap.get(cleanUrl(rawUrl))?.supporting_excerpt || ''
                });
            }
        }
    }

    let evidence = [...urlMap.values()];

    // ── Enforce single official website ──────────────────────────────────────
    // The first source classified as 'Official Website' (by highest confidence)
    // keeps is_official_website=true; all remaining are downgraded to 'Directory'.
    let officialFound = false;
    for (const ev of evidence) {
        if (ev.source_type === 'Official Website') {
            if (!officialFound) {
                officialFound = true;
            } else {
                ev.source_type        = 'Directory';
                ev.is_official_website = false;
            }
        }
    }

    // ── Sort by trust priority (Official Website first) ───────────────────────
    evidence.sort((a, b) => {
        // Primary: source type priority
        const diff = sourcePriority(a.source_type) - sourcePriority(b.source_type);
        if (diff !== 0) return diff;
        // Secondary: higher confidence first
        return (b.confidence ?? 0) - (a.confidence ?? 0);
    });

    const finalResult = { business_input: businessInput, evidence };

    console.log(`📊 Evidence collected: ${evidence.length} sources (official: ${officialFound ? '1' : '0'})`);

    // 6. Return in shape expected by search.routes.js
    return {
        formattedText: JSON.stringify(finalResult, null, 2),
        rawResults: {
            ...resultData,
            result: finalResult
        },
        queries: []
    };
}

// Exports
module.exports = {
    enhancedSearch,
    buildPrompt,
    parseBusinessInput,
    deriveSourceType,
    safeHostname,
    cleanUrl,
    buildAddress
};
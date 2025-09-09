export type CheckList = {
    asked_intention : boolean;
    provided_name : boolean;
    provided_age : boolean;
    provided_place : boolean;
};

export const ZERO: CheckList = {
    asked_intention : false,
    provided_name : false,
    provided_age : false,
    provided_place : false,
};

const stateByConversation = new Map<string, CheckList>();

export function buildChecklistPrompt(utterance: string) {
    return `
  You are a JSON-only tagger. Given exactly ONE user utterance, decide which of these checklist items are satisfied by THIS utterance only, and output STRICT JSON with no explanation.
  
  SCHEMA:
  {
    "asked_intention": boolean,  // true if the utterance asks about the other person's intention/goal (e.g., "what is your intention?", "what do you want to do?")
    "provided_name": boolean,    // true if the speaker states their own name (e.g., "I'm Alex", "My name is Sara")
    "provided_age": boolean,     // true if the speaker states their age (e.g., "I'm 23", "I am twenty five")
    "provided_place": boolean    // true if the speaker states where they are from/live/are currently (city/region/country)
  }
  
  RULES:
  - Consider ONLY the utterance below (ignore prior context).
  - Output EXACTLY one JSON object matching the schema.
  - Do NOT include extra keys, comments, or prose.
  
  EXAMPLES:
  Input: "what is your intention?"
  Output: {"asked_intention": true, "provided_name": false, "provided_age": false, "provided_place": false}
  
  Input: "I'm Sam and I'm 21"
  Output: {"asked_intention": false, "provided_name": true, "provided_age": true, "provided_place": false}
  
  Input: "I live in Colombo"
  Output: {"asked_intention": false, "provided_name": false, "provided_age": false, "provided_place": true}
  
  NOW ANALYZE THIS UTTERANCE:
  """${utterance}"""
  Return ONLY the JSON.
  `.trim();
  }

export function parseChecklist(jsonText: string): Partial<CheckList> {
    try {
      const obj = JSON.parse(jsonText);
      return {
        asked_intention: !!obj?.asked_intention,
        provided_name:   !!obj?.provided_name,
        provided_age:    !!obj?.provided_age,
        provided_place:  !!obj?.provided_place,
      };
    } catch {
      return {};
    }
  }

export function mergeChecklist(prev: CheckList, next: Partial<CheckList>): CheckList {
    return {
      asked_intention: prev.asked_intention || !!next.asked_intention,
      provided_name:   prev.provided_name   || !!next.provided_name,
      provided_age:    prev.provided_age    || !!next.provided_age,
      provided_place:  prev.provided_place  || !!next.provided_place,
    };
  }

  export function getChecklistState(conversationKey: string): CheckList {
    return stateByConversation.get(conversationKey) ?? ZERO;
  }
  
  export function updateChecklistState(conversationKey: string, partial: Partial<CheckList>): CheckList {
    const merged = mergeChecklist(getChecklistState(conversationKey), partial);
    stateByConversation.set(conversationKey, merged);
    return merged;
  }
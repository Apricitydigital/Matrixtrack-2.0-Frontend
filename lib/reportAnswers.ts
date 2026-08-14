export type NormalizedAnswer = {
    questionCode?: string;
    questionText: string;
    answerText: string;
    photos: string[];
};

export const SWEEPING_QUESTION_MAP: Record<string, string> = {
    q1: "Is sweeping done on this beat today?",
    q2: "How many times is sweeping done in a day?",
    q3: "Is sweeping done as per prescribed frequency?",
    q4: "Is the entire beat properly cleaned?",
    q5: "Is any litter visible after sweeping?",
    q6: "Is sanitation worker present?",
    q7: "Is sanitation worker wearing complete PPE?",
    q8: "Type of road",
    q9: "Is this a major / 4 lane road?",
    q10: "Is mechanized sweeping required?",
    q11: "Is mechanized sweeping happening?",
    q12: "Any Garbage Vulnerable Point observed?",
    q13: "If yes, is GVP cleaned regularly?",
    q14: "Any C&D waste found?",
    q15: "Resident Name / Mobile / Address",
    q16: "Resident says sweeping frequency",
    q17: "Is beat cleaned as per standards?",
    q18: "Overall cleanliness",
    q19: "Remarks"
};

export const LITTERBIN_QUESTION_MAP: Record<string, string> = {
    q1: "Is the litter bin clean and emptied?",
    q2: "Is the litter bin fixed properly?",
    q3: "Is the litter bin free of damage?",
    q4: "Is the lid present and functional?",
    q5: "Is the surrounding area clean?",
    q6: "Are twin bins separated correctly?",
    q7: "Is branding / labeling visible?",
    q8: "Is there any foul odor?",
    q9: "Is overflow prevented?",
    q10: "Overall condition compliant?"
};

export function parseReportAnswer(val: any): { answerText: string; photos: string[] } {
    if (val === null || val === undefined) return { answerText: "N/A", photos: [] };

    let answerVal: any = val;
    let photos: string[] = [];

    // Parse stringified JSON if needed
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                const parsed = JSON.parse(trimmed);
                val = parsed;
                answerVal = parsed;
            } catch (e) {
                // Not JSON
            }
        } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/') || trimmed.startsWith('/uploads/') || /\.(jpeg|jpg|png|gif|webp)$/i.test(trimmed)) {
            photos.push(trimmed);
            answerVal = "Photo Attached";
        }
    }

    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        answerVal = val.answer !== undefined ? val.answer :
                    val.value !== undefined ? val.value :
                    val.val !== undefined ? val.val :
                    val.response !== undefined ? val.response :
                    val.selectedOption !== undefined ? val.selectedOption :
                    val.option !== undefined ? val.option :
                    val.text !== undefined ? val.text :
                    val.status !== undefined ? val.status : val;

        // Extract photos
        const rawPhotos = [val.photos, val.images, val.photoUrl, val.photo_url, val.photo, val.image, val.imageUrl, val.image_url, val.url, val.actionPhotoUrl].flat().filter(Boolean);
        photos = rawPhotos.filter((p): p is string => typeof p === 'string' && p.length > 5);
    }

    let answerText = "N/A";
    if (typeof answerVal === 'boolean') {
        answerText = answerVal ? "YES" : "NO";
    } else if (typeof answerVal === 'string' || typeof answerVal === 'number') {
        const str = String(answerVal).trim();
        if (str.toUpperCase() === 'TRUE') answerText = 'YES';
        else if (str.toUpperCase() === 'FALSE') answerText = 'NO';
        else answerText = str;
    } else if (typeof answerVal === 'object' && answerVal !== null) {
        answerText = JSON.stringify(answerVal);
    }

    return { answerText: answerText || "N/A", photos };
}

// Fields that should never appear as Q&A items (they are record metadata)
const METADATA_SKIP_KEYS = new Set([
    'id', 'status', 'createdAt', 'updatedAt', 'type', 'moduleKey',
    'photo', 'photoUrl', 'actionPhotoUrl', 'imageUrl',
    'assignedEmployeeIds', 'assignedSupervisorId',
    'locationName', 'areaName', 'zoneName', 'wardName', 'zoneId', 'wardId',
    'beatName', 'beatId', 'segmentId', 'cityId',
    'createdBy', 'updatedBy', 'supervisorId', 'employeeId', 'phone',
    'latitude', 'longitude', 'distanceMeters', 'gpsAccuracy',
    'recordId', 'inspectionId', 'visitId'
]);

// Keys that look like question keys (q1, q2, ... or numbered)
function looksLikeQuestionKey(key: string): boolean {
    return /^q\d+$/i.test(key.trim()) || /^\d+$/.test(key.trim());
}

export function normalizeInspectionAnswers(
    rawInput: any,
    fallbackQuestionMap?: Record<string, string>
): NormalizedAnswer[] {
    if (!rawInput) return [];

    let answersObj: any = rawInput;

    // Parse stringified JSON
    if (typeof answersObj === 'string') {
        try { answersObj = JSON.parse(answersObj); } catch { return []; }
    }

    // Unwrap if passed a whole record object — try every known wrapper key
    if (answersObj && typeof answersObj === 'object' && !Array.isArray(answersObj)) {
        if (answersObj.inspectionAnswers && typeof answersObj.inspectionAnswers === 'object') {
            answersObj = answersObj.inspectionAnswers;
        } else if (answersObj.answers && typeof answersObj.answers === 'object') {
            answersObj = answersObj.answers;
        } else if (answersObj.responses && typeof answersObj.responses === 'object') {
            answersObj = answersObj.responses;
        } else if (answersObj.checklist && typeof answersObj.checklist === 'object') {
            answersObj = answersObj.checklist;
        } else if (answersObj.questionnaire && typeof answersObj.questionnaire === 'object') {
            answersObj = answersObj.questionnaire;
        } else if (answersObj.data && typeof answersObj.data === 'object' && !answersObj.data.id) {
            answersObj = answersObj.data;
        } else if (answersObj.payload && typeof answersObj.payload === 'object') {
            const p = answersObj.payload;
            answersObj = p.inspectionAnswers || p.answers || p.responses || p.checklist || p.questionnaire || p.data || p;
        }
    }

    // Second parse if still string
    if (typeof answersObj === 'string') {
        try { answersObj = JSON.parse(answersObj); } catch { return []; }
    }

    if (!answersObj) return [];

    const activeMap: Record<string, string> = {
        ...SWEEPING_QUESTION_MAP,
        ...LITTERBIN_QUESTION_MAP,
        ...(fallbackQuestionMap || {})
    };

    const items: NormalizedAnswer[] = [];

    // ARRAY format: [{questionText, answer}, ...]
    if (Array.isArray(answersObj)) {
        answersObj.forEach((item: any, idx: number) => {
            const qText = item?.questionText || item?.question || item?.label || item?.title || item?.text || `Question ${idx + 1}`;
            const { answerText, photos } = parseReportAnswer(item?.answer ?? item?.value ?? item?.val ?? item);
            items.push({ questionCode: `q${idx + 1}`, questionText: qText, answerText, photos });
        });
        return items;
    }

    // OBJECT format: {q1: val, q2: val, ...} or {someKey: val, ...}
    if (typeof answersObj === 'object' && answersObj !== null) {
        // Check if this looks like a raw record (has status + non-q keys) but has no q-keys
        const keys = Object.keys(answersObj);
        const hasQKeys = keys.some(k => looksLikeQuestionKey(k));
        const hasMetaKeys = keys.some(k => METADATA_SKIP_KEYS.has(k));

        // If it has metadata keys but NO q-keys, it's likely a raw record with no embedded answers
        if (hasMetaKeys && !hasQKeys && !keys.some(k => activeMap[k.toLowerCase()])) {
            return [];
        }

        Object.entries(answersObj).forEach(([key, val]) => {
            // Always skip pure metadata keys
            if (METADATA_SKIP_KEYS.has(key)) return;
            // Skip null/undefined values
            if (val === null || val === undefined) return;

            let qText = key;
            let qCode = key;

            // Check for embedded question text inside value object
            if (val && typeof val === 'object' && !Array.isArray(val)) {
                const inner = (val as any);
                const innerText = inner.questionText || inner.question || inner.label || inner.title || inner.text;
                if (innerText && typeof innerText === 'string') qText = innerText;
            }

            // Map code to human-readable question text
            const codeKey = key.toLowerCase().trim();
            const matchedKey = Object.keys(activeMap).find(k => k.toLowerCase().trim() === codeKey);
            if (matchedKey) {
                qText = activeMap[matchedKey];
            } else if (/^\d+$/.test(qText)) {
                qText = `Question ${Number(qText) + 1}`;
            }

            const { answerText, photos } = parseReportAnswer(val);

            // Skip keys that have no meaningful value and aren't question codes
            if (answerText === 'N/A' && photos.length === 0 && !looksLikeQuestionKey(key) && !matchedKey) {
                return;
            }

            items.push({ questionCode: qCode, questionText: qText, answerText, photos });
        });
    }

    return items;
}

export function photoIntegrityConfidence(raw: any): number | null {
  const values: number[] = [];
  const inspect = (node: any, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 7) return;
    if (node.photoIntegrity?.suspected === true) {
      const value = Number(node.photoIntegrity.confidencePercent);
      if (Number.isFinite(value) && value >= 0 && value <= 100) values.push(value);
    }
    if (Array.isArray(node)) node.forEach(n => inspect(n, depth + 1));
    else for (const key of ['payload', 'points', 'answers', 'questionnaire', 'surveyAnswers', 'inspectionAnswers']) inspect(node[key], depth + 1);
  };
  inspect(raw);
  return values.length ? Math.max(...values) : null;
}

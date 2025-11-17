/**
 * Template Interpolator
 * 
 * Replaces {variable} placeholders in template strings with actual values.
 * 
 * Example:
 *   Template: "Analyze {projectName} for {designSystem} adoption"
 *   Variables: { projectName: "MyApp", designSystem: "MyDS" }
 *   Result: "Analyze MyApp for MyDS adoption"
 * 
 * This allows templates to be dynamic and adapt to different projects.
 */

export class TemplateInterpolator {
  /**
   * Interpolate variables into a template string
   * 
   * @param template - String with {variable} placeholders
   * @param variables - Object with variable values
   * @param strict - If true, throw error on missing variables
   */
  interpolate(
    template: string,
    variables: Record<string, string | number>,
    strict = false
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      if (key in variables) {
        return String(variables[key]);
      }

      if (strict) {
        throw new Error(`Missing variable in template: ${key}`);
      }

      // If not strict, leave placeholder as-is
      return match;
    });
  }

  /**
   * Extract variable names from a template string
   * Useful for validation and debugging
   * 
   * Example: "Hello {name} from {city}" -> ["name", "city"]
   */
  extractVariables(template: string): string[] {
    const matches = template.matchAll(/\{(\w+)\}/g);
    return [...matches].map((match) => match[1] ?? '');
  }

  /**
   * Validate that all variables in a template can be satisfied
   * Returns missing variable names, or empty array if all present
   */
  validateVariables(template: string, variables: Record<string, unknown>): string[] {
    const required = this.extractVariables(template);
    return required.filter((varName) => !(varName in variables));
  }
}


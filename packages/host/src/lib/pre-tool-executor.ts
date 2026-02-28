import { spawn } from 'child_process';
import { join } from 'path';
import { renderTemplate } from './template';
import type { PreToolCmd } from '../types';

/**
 * Execute pre-tool commands and return their combined output
 * @param skillDir Absolute path to skill directory
 * @param preCmds Array of pre-tool command configurations
 * @param input Input data from the request
 * @returns Combined stdout from all scripts (Markdown format)
 */
export async function runPreToolCmds(
  skillDir: string,
  preCmds: PreToolCmd[],
  input: Record<string, unknown>
): Promise<string> {
  const results: string[] = [];

  for (const cmd of preCmds) {
    try {
      const params = resolveInputMap(cmd.input_map, input);
      const stdout = await execScript(skillDir, cmd.script, params);
      if (stdout) {
        results.push(stdout);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (cmd.optional) {
        console.warn(`[pre_tool_cmd] Script failed (optional, skipping): ${cmd.script}`, errorMessage);
        continue;
      }

      throw new Error(`Pre-tool script failed: ${cmd.script} - ${errorMessage}`);
    }
  }

  return results.filter(Boolean).join('\n\n');
}

/**
 * Execute a single script with JSON input via stdin
 * @param skillDir Absolute path to skill directory
 * @param scriptPath Path to script relative to skill directory
 * @param params Parameters to pass as JSON via stdin
 * @returns Script stdout
 */
async function execScript(
  skillDir: string,
  scriptPath: string,
  params: Record<string, unknown>
): Promise<string> {
  const absPath = join(skillDir, scriptPath);
  const stdinJson = JSON.stringify(params);

  return new Promise((resolve, reject) => {
    const proc = spawn(absPath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000, // 30 second timeout
      cwd: skillDir,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn script: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Script exited with code ${code}. stderr: ${stderr}`));
      }
    });

    // Write JSON input to stdin
    proc.stdin.write(stdinJson);
    proc.stdin.end();
  });
}

/**
 * Resolve input_map templates with actual input values
 * @param inputMap Template mapping: { paramName: "{{fieldName}}" }
 * @param input Actual input data
 * @returns Resolved parameters
 */
function resolveInputMap(
  inputMap: Record<string, string>,
  input: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [paramName, template] of Object.entries(inputMap)) {
    resolved[paramName] = renderTemplate(template, input);
  }

  return resolved;
}

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const rm = promisify(fs.rm);

// Paths
const MINECRAFT_PACKS_PATH = "C:/Users/rtx/AppData/Roaming/Minecraft Bedrock/Users/Shared/games/com.mojang"

const TEMP_DIR = path.join(__dirname, "temp_build");

// Helper Functions
async function findTypeScriptFiles(directory) {
  let results = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(await findTypeScriptFiles(fullPath));
    } else if (entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }

  return results;
}

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function compileTypeScript(directory) {
  try {
    const scriptsDir = path.join(directory, "scripts");
    if (!fs.existsSync(scriptsDir)) {
      console.log("│    ├─ No scripts directory found, skipping TypeScript compilation");
      return;
    }

    const tsFiles = await findTypeScriptFiles(scriptsDir);
    if (tsFiles.length === 0) {
      console.log("│    ├─ No TypeScript files found, skipping compilation");
      return;
    }

    console.log(`│    ├─ Found ${tsFiles.length} TypeScript files to compile`);

    const tsConfig = {
      compilerOptions: {
        target: "ES2020",
        module: "ES2020",
        moduleResolution: "node",
        outDir: scriptsDir,
        rootDir: scriptsDir,
        esModuleInterop: true,
        allowJs: true,
        checkJs: false,
        noEmitOnError: false,
        skipLibCheck: true,
        strict: false,
        noImplicitAny: false,
        allowUnreachableCode: true,
        allowUnusedLabels: true,
        noFallthroughCasesInSwitch: false,
        noImplicitReturns: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        types: [],
      },
      include: tsFiles.map((file) => file.replace(/\\/g, "/")),
      exclude: ["node_modules"],
    };

    const tsConfigPath = path.join(directory, "tsconfig.temp.json");
    await fs.promises.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));

    return new Promise((resolve, reject) => {
      const tscProcess = exec(`tsc --project "${tsConfigPath}" --noEmitOnError false`, { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
        try {
          if (stdout) console.log("Compiler output:", stdout);
          if (stderr) console.log("Compiler messages:", stderr);
          await rm(tsConfigPath).catch(() => {});
          const removeTypescriptFiles = async (dir) => {
            const entries = await readdir(dir, { withFileTypes: true });
            for (let entry of entries) {
              const fullPath = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                await removeTypescriptFiles(fullPath);
              } else if (entry.name.endsWith(".ts")) {
                await rm(fullPath).catch(() => {});
              }
            }
          };

          await removeTypescriptFiles(scriptsDir);
          console.log("│    └─ Compilation completed and TypeScript files removed");
          resolve();
        } catch (err) {
          console.log("│    ├─ ⚠ Warning: Error during cleanup, but continuing anyway");
          resolve();
        }
      });

      tscProcess.stdout?.pipe(process.stdout);
      tscProcess.stderr?.pipe(process.stderr);
    });
  } catch (error) {
    console.log("Warning: Error during TypeScript compilation, but continuing anyway");
    return Promise.resolve();
  }
}

async function processFolder(folderPath) {
  try {
    const manifestPath = path.join(folderPath, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      return;
    }

    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const modules = manifest.modules || [];
    
    const hasData = modules.some((m) => m.type === "data" || m.type == "script");
    const hasScript = modules.some((m) => m.type === "script");
    const hasResources = modules.some((m) => m.type === "resources");

    const folderName = path.basename(folderPath);

    if (hasData) {
      console.log(`│    ├─ Processing behavior pack: ${folderName}`);
      const tempPath = path.join(TEMP_DIR, folderName);
      await rm(tempPath, { recursive: true, force: true });
      await copyDir(folderPath, tempPath);

      if (hasScript) {
        console.log(`│    ├─ Compiling TypeScript files in: ${folderName}`);
        await compileTypeScript(tempPath);
      }

      const behaviorPackPath = path.join(MINECRAFT_PACKS_PATH, "development_behavior_packs", folderName);
      await rm(behaviorPackPath, { recursive: true, force: true });
      await copyDir(tempPath, behaviorPackPath);
      console.log(`├─ ✔️ Deployed behavior pack: ${folderName}`);

      await rm(tempPath, { recursive: true, force: true });
    }

    if (hasResources) {
      console.log(`│    └─ Processing resource pack: ${folderName}`);
      const resourcePackPath = path.join(MINECRAFT_PACKS_PATH, "development_resource_packs", folderName);
      await rm(resourcePackPath, { recursive: true, force: true });
      await copyDir(folderPath, resourcePackPath);
      console.log(`├─ ✔️ Deployed resource pack: ${folderName}`);
    }
  } catch (error) {
    console.error(`├─ ⚠️ Warning: Error processing folder ${folderPath}, but continuing:`, error);
  }
}

async function main() {
  try {
    await mkdir(TEMP_DIR, { recursive: true });

    const entries = await readdir(__dirname, { withFileTypes: true });
    const folders = entries.filter((entry) => entry.isDirectory() && entry.name !== "temp_build");

    console.log("├─ 🔄 Starting pack building process...");

    for (let folder of folders) {
      await processFolder(path.join(__dirname, folder.name));
    }

    await rm(TEMP_DIR, { recursive: true, force: true });

    console.log("└─ ✅ Pack building process completed successfully!");
  } catch (error) {
    console.error("└─ Error during pack building process, but some operations may have succeeded:", error);
  }
}

main();
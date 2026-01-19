import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import { useLanguage } from '../contexts/LanguageContext';
import XTermLogViewer, { XTermLogViewerRef } from './XTermLogViewer';
import { getFrameworkIcon } from './FrameworkIcons';
import legacyVersions from '../data/legacy-versions.json';

// Source code types/frameworks
export type SourceType = 
  | 'laravel' | 'wordpress' | 'symfony' | 'codeigniter'
  | 'nodejs-express' | 'nodejs-nestjs' | 'nodejs-fastify'
  | 'vuejs' | 'vuejs-nuxt'
  | 'react' | 'react-nextjs'
  | 'typescript-node';

// Framework version info with PHP requirements
interface FrameworkVersion {
  version: string;
  label: string;
  phpMin: string;      // Minimum PHP version required
  phpMax?: string;     // Maximum PHP version (optional)
  lts?: boolean;
  subVersions?: string[];  // Specific patch versions
}

// Static framework major versions (used as fallback)
const FRAMEWORK_VERSIONS: Record<string, FrameworkVersion[]> = {
  laravel: [
    { version: '12', label: 'Laravel 12', phpMin: '8.3', lts: false, subVersions: [] },
    { version: '11', label: 'Laravel 11', phpMin: '8.2', lts: true, subVersions: [] },
    { version: '10', label: 'Laravel 10', phpMin: '8.1', lts: true, subVersions: [] },
    { version: '9', label: 'Laravel 9', phpMin: '8.0', phpMax: '8.2', subVersions: [] },
    { version: '8', label: 'Laravel 8', phpMin: '7.3', phpMax: '8.1', subVersions: [] },
  ],
  symfony: [
    { version: '8.0', label: 'Symfony 8.0', phpMin: '8.2', subVersions: [] },
    { version: '7.4', label: 'Symfony 7.4 LTS', phpMin: '8.2', lts: true, subVersions: [] },
    { version: '7.3', label: 'Symfony 7.3', phpMin: '8.2', subVersions: [] },
    { version: '6.4', label: 'Symfony 6.4 LTS', phpMin: '8.1', lts: true, subVersions: [] },
    { version: '5.4', label: 'Symfony 5.4 LTS', phpMin: '7.2.5', phpMax: '8.2', lts: true, subVersions: [] },
  ],
  codeigniter: [
    { version: '4', label: 'CodeIgniter 4', phpMin: '8.1', subVersions: [] },
    { version: '3', label: 'CodeIgniter 3 (Legacy)', phpMin: '5.6', phpMax: '8.0', subVersions: [] },
  ],
  wordpress: [
    { version: 'latest', label: 'Latest (Recommended)', phpMin: '7.4', subVersions: [] },
    { version: '6.7', label: 'WordPress 6.7', phpMin: '7.4', subVersions: [] },
    { version: '6.6', label: 'WordPress 6.6', phpMin: '7.4', subVersions: [] },
    { version: '6.5', label: 'WordPress 6.5', phpMin: '7.4', subVersions: [] },
    { version: '6.4', label: 'WordPress 6.4', phpMin: '7.4', subVersions: [] },
    { version: '6.0', label: 'WordPress 6.0', phpMin: '7.4', subVersions: [] },
    { version: '5.9', label: 'WordPress 5.9', phpMin: '5.6', subVersions: [] },
    { version: '5.0', label: 'WordPress 5.0', phpMin: '5.6', subVersions: [] },
    { version: '4.9', label: 'WordPress 4.9', phpMin: '5.2', subVersions: [] },
    { version: '4.8', label: 'WordPress 4.8', phpMin: '5.2', subVersions: [] },
    { version: '4.7', label: 'WordPress 4.7', phpMin: '5.2', subVersions: [] },
    { version: '4.0', label: 'WordPress 4.0', phpMin: '5.2', subVersions: [] },
  ],
};

// API URLs for fetching versions
const VERSION_APIS = {
  symfony: 'https://symfony.com/releases.json',
  laravel: 'https://api.github.com/repos/laravel/laravel/releases',
  wordpress: 'https://api.github.com/repos/WordPress/WordPress/tags',
  codeigniter4: 'https://api.github.com/repos/codeigniter4/CodeIgniter4/releases',
  codeigniter3: 'https://api.github.com/repos/bcit-ci/CodeIgniter/releases',
  // Node.js frameworks
  express: 'https://registry.npmjs.org/express',
  nestjs: 'https://registry.npmjs.org/@nestjs/core',
  fastify: 'https://registry.npmjs.org/fastify',
  vue: 'https://registry.npmjs.org/vue',
  nuxt: 'https://registry.npmjs.org/nuxt',
  react: 'https://registry.npmjs.org/react',
  nextjs: 'https://registry.npmjs.org/next',
};

// Fetch sub-versions for a framework
async function fetchFrameworkSubVersions(frameworkId: string, majorVersion: string): Promise<string[]> {
  try {
    switch (frameworkId) {
      case 'laravel': {
        const majorNum = parseInt(majorVersion);
        
        // For versions 8, 9, 10 use static JSON data
        if (majorNum <= 10) {
          const laravelData = legacyVersions.laravel as Record<string, { label: string; phpMin: string; subVersions: string[] }>;
          const versionData = laravelData[majorVersion];
          return versionData ? versionData.subVersions : [];
        }
        
        // For 11+, fetch from GitHub releases API
        const response = await fetch('https://api.github.com/repos/laravel/laravel/releases?per_page=100');
        if (!response.ok) throw new Error('Failed to fetch Laravel versions');
        const releases = await response.json();
        // Filter releases by major version
        const filtered = releases
          .filter((r: any) => !r.prerelease && r.tag_name.startsWith(`v${majorVersion}.`))
          .slice(0, 20)
          .map((r: any) => r.tag_name.replace('v', ''));
        return filtered;
      }
      
      case 'symfony': {
        // Fetch from Symfony releases API
        const response = await fetch(VERSION_APIS.symfony);
        if (!response.ok) throw new Error('Failed to fetch Symfony versions');
        const data = await response.json();
        // Get supported versions and find matching major
        const flexVersions = data.flex_supported_versions || [];
        const matching = flexVersions.filter((v: string) => v.startsWith(majorVersion.split('.')[0] + '.'));
        return matching.slice(0, 10);
      }
      
      case 'codeigniter': {
        if (majorVersion === '4') {
          const response = await fetch(VERSION_APIS.codeigniter4);
          if (!response.ok) throw new Error('Failed to fetch CI4 versions');
          const releases = await response.json();
          return releases
            .filter((r: any) => !r.prerelease && r.tag_name.startsWith('v4.'))
            .slice(0, 15)
            .map((r: any) => r.tag_name.replace('v', ''));
        } else if (majorVersion === '3') {
          const response = await fetch(VERSION_APIS.codeigniter3);
          if (!response.ok) throw new Error('Failed to fetch CI3 versions');
          const releases = await response.json();
          return releases
            .filter((r: any) => !r.prerelease && r.tag_name.startsWith('3.'))
            .slice(0, 15)
            .map((r: any) => r.tag_name);
        }
        return [];
      }
      
      case 'wordpress': {
        if (majorVersion === 'latest') return [];
        
        // For 4.x and 5.x, use static JSON data
        const majorNum = parseFloat(majorVersion);
        if (majorNum < 6.0) {
          const wpData = legacyVersions.wordpress as Record<string, { label: string; phpMin: string; subVersions: string[] }>;
          const versionData = wpData[majorVersion];
          return versionData ? versionData.subVersions : [];
        }
        
        // For 6.x+, fetch from GitHub tags API
        const response = await fetch('https://api.github.com/repos/WordPress/WordPress/tags?per_page=100');
        if (!response.ok) throw new Error('Failed to fetch WordPress versions');
        const tags = await response.json();
        // Filter tags by major version (e.g., 6.7 -> 6.7.1, 6.7.2, etc.)
        const filtered = tags
          .map((t: any) => t.name)
          .filter((v: string) => v.startsWith(`${majorVersion}.`))
          .slice(0, 15);
        return filtered;
      }
      
      default:
        return [];
    }
  } catch (error) {
    console.error(`Failed to fetch ${frameworkId} sub-versions:`, error);
    return [];
  }
}

// Fetch npm package versions
async function fetchNpmVersions(packageName: string): Promise<string[]> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);
    if (!response.ok) throw new Error(`Failed to fetch ${packageName} versions`);
    const data = await response.json();
    
    // Get all versions and sort them
    const versions = Object.keys(data.versions || {})
      .filter(v => !v.includes('-')) // Exclude pre-release versions
      .sort((a, b) => {
        const [aMajor, aMinor = 0, aPatch = 0] = a.split('.').map(Number);
        const [bMajor, bMinor = 0, bPatch = 0] = b.split('.').map(Number);
        return bMajor - aMajor || bMinor - aMinor || bPatch - aPatch;
      })
      .slice(0, 20);
    
    return versions;
  } catch (error) {
    console.error(`Failed to fetch npm versions for ${packageName}:`, error);
    return [];
  }
}

// Map source IDs to npm package names
const NPM_PACKAGE_MAP: Record<string, string> = {
  'nodejs-express': 'express',
  'nodejs-nestjs': '@nestjs/core',
  'nodejs-fastify': 'fastify',
  'vuejs': 'vue',
  'vuejs-nuxt': 'nuxt',
  'react': 'react',
  'react-nextjs': 'next',
  'typescript-node': 'typescript',
};

interface SourceOption {
  id: SourceType;
  name: string;
  category: 'PHP' | 'JavaScript' | 'TypeScript';
  icon: string;
  descriptionKey: string;  // Translation key for description
  requiresDb?: boolean;
  dbConfigFile?: string;
  dbConfigFormat?: 'env' | 'php' | 'json';
  requiresComposer?: boolean;
  requiresNode?: boolean;
  hasVersions?: boolean;
  dynamicVersions?: boolean;  // True if versions should be fetched dynamically
}

const SOURCE_OPTIONS: SourceOption[] = [
  // PHP Frameworks
  { id: 'laravel', name: 'Laravel', category: 'PHP', icon: 'laravel', descriptionKey: 'sourceLaravelDesc', requiresDb: true, dbConfigFile: '.env', dbConfigFormat: 'env', requiresComposer: true, hasVersions: true, dynamicVersions: true },
  { id: 'wordpress', name: 'WordPress', category: 'PHP', icon: 'wordpress', descriptionKey: 'sourceWordPressDesc', requiresDb: true, dbConfigFile: 'wp-config.php', dbConfigFormat: 'php', hasVersions: true, dynamicVersions: true },
  { id: 'symfony', name: 'Symfony', category: 'PHP', icon: 'symfony', descriptionKey: 'sourceSymfonyDesc', requiresDb: true, dbConfigFile: '.env', dbConfigFormat: 'env', requiresComposer: true, hasVersions: true },
  { id: 'codeigniter', name: 'CodeIgniter', category: 'PHP', icon: 'codeigniter', descriptionKey: 'sourceCodeIgniterDesc', requiresDb: true, dbConfigFile: '.env', dbConfigFormat: 'env', requiresComposer: true, hasVersions: true },
  
  // JavaScript Frameworks - with version selection
  { id: 'nodejs-express', name: 'Express.js', category: 'JavaScript', icon: 'nodejs-express', descriptionKey: 'sourceExpressDesc', requiresDb: false, requiresNode: true, hasVersions: true },
  { id: 'nodejs-nestjs', name: 'NestJS', category: 'JavaScript', icon: 'nodejs-nestjs', descriptionKey: 'sourceNestJSDesc', requiresDb: true, dbConfigFile: '.env', dbConfigFormat: 'env', requiresNode: true, hasVersions: true },
  { id: 'nodejs-fastify', name: 'Fastify', category: 'JavaScript', icon: 'nodejs-fastify', descriptionKey: 'sourceFastifyDesc', requiresDb: false, requiresNode: true, hasVersions: true },
  { id: 'vuejs', name: 'Vue.js', category: 'JavaScript', icon: 'vuejs', descriptionKey: 'sourceVueDesc', requiresDb: false, requiresNode: true, hasVersions: true },
  { id: 'vuejs-nuxt', name: 'Nuxt.js', category: 'JavaScript', icon: 'vuejs-nuxt', descriptionKey: 'sourceNuxtDesc', requiresDb: false, requiresNode: true, hasVersions: true },
  { id: 'react', name: 'React', category: 'JavaScript', icon: 'react', descriptionKey: 'sourceReactDesc', requiresDb: false, requiresNode: true, hasVersions: true },
  { id: 'react-nextjs', name: 'Next.js', category: 'JavaScript', icon: 'react-nextjs', descriptionKey: 'sourceNextJSDesc', requiresDb: false, requiresNode: true, hasVersions: true },
  
  // TypeScript
  { id: 'typescript-node', name: 'TypeScript Node', category: 'TypeScript', icon: 'typescript-node', descriptionKey: 'sourceTypeScriptDesc', requiresDb: false, requiresNode: true, hasVersions: true },
];

// PHP version requirements for Laravel versions (used when fetching dynamically)
const LARAVEL_PHP_REQUIREMENTS: Record<string, { phpMin: string; phpMax?: string; lts?: boolean }> = {
  '13': { phpMin: '8.3' },
  '12': { phpMin: '8.3' },
  '11': { phpMin: '8.2', lts: true },
  '10': { phpMin: '8.1', lts: true },
  '9': { phpMin: '8.0', phpMax: '8.2' },
  '8': { phpMin: '7.3', phpMax: '8.1' },
};

// Fetch Laravel major versions dynamically from GitHub (11+) and merge with legacy versions (8, 9, 10)
async function fetchLaravelMajorVersions(): Promise<FrameworkVersion[]> {
  try {
    // Fetch from GitHub API for 11+ only (1 page is enough)
    const response = await fetch('https://api.github.com/repos/laravel/laravel/releases?per_page=100');
    if (!response.ok) throw new Error('Failed to fetch Laravel versions');
    const releases = await response.json();
    
    // Extract unique major versions (>= 11 from API)
    const majorVersions = new Set<string>();
    for (const release of releases) {
      const match = release.tag_name.match(/^v?(\d+)\./);
      if (match) {
        const major = parseInt(match[1]);
        if (major >= 11) {
          majorVersions.add(match[1]);
        }
      }
    }
    
    // Build versions array starting with API versions (11+)
    // Note: laravel/laravel package uses simplified versioning, no subVersions needed
    const versions: FrameworkVersion[] = Array.from(majorVersions)
      .sort((a, b) => parseInt(b) - parseInt(a))
      .map(major => {
        const reqs = LARAVEL_PHP_REQUIREMENTS[major] || { phpMin: '8.2' };
        return {
          version: major,
          label: `Laravel ${major}`,
          phpMin: reqs.phpMin,
          phpMax: reqs.phpMax,
          lts: reqs.lts,
          subVersions: [], // Not used - composer will get latest of major version
        };
      });
    
    // Add 8, 9, 10 from static JSON data with correct laravel/laravel package versions
    const laravelData = legacyVersions.laravel as Record<string, { label: string; phpMin: string; phpMax?: string; lts?: boolean; subVersions?: string[] }>;
    ['10', '9', '8'].forEach(major => {
      const data = laravelData[major];
      if (data) {
        versions.push({
          version: major,
          label: data.label,
          phpMin: data.phpMin,
          phpMax: data.phpMax,
          lts: data.lts,
          subVersions: data.subVersions || [], // Include subVersions for version selection
        });
      }
    });
    
    return versions.length > 0 ? versions : FRAMEWORK_VERSIONS.laravel;
  } catch (error) {
    console.error('Failed to fetch Laravel versions:', error);
    // Return fallback with legacy versions
    const versions: FrameworkVersion[] = [...FRAMEWORK_VERSIONS.laravel.filter(v => parseInt(v.version) >= 11)];
    const laravelData = legacyVersions.laravel as Record<string, { label: string; phpMin: string; phpMax?: string; lts?: boolean; subVersions?: string[] }>;
    ['10', '9', '8'].forEach(major => {
      const data = laravelData[major];
      if (data && !versions.find(v => v.version === major)) {
        versions.push({
          version: major,
          label: data.label,
          phpMin: data.phpMin,
          phpMax: data.phpMax,
          lts: data.lts,
          subVersions: data.subVersions || [], // Include subVersions for version selection
        });
      }
    });
    return versions;
  }
}

// Fetch WordPress major versions dynamically from GitHub (6.x+) and merge with legacy versions
async function fetchWordPressMajorVersions(): Promise<FrameworkVersion[]> {
  try {
    // Fetch from GitHub API for 6.x and newer versions only
    const response = await fetch('https://api.github.com/repos/WordPress/WordPress/tags?per_page=100');
    if (!response.ok) throw new Error('Failed to fetch WordPress versions');
    const tags = await response.json();
    
    // Extract unique major.minor versions (>= 6.0 from API)
    const majorVersions = new Map<string, string>();
    for (const tag of tags) {
      const match = tag.name.match(/^(\d+\.\d+)/);
      if (match) {
        const major = match[1];
        const majorNum = parseFloat(major);
        if (majorNum >= 6.0 && !majorVersions.has(major)) {
          majorVersions.set(major, tag.name);
        }
      }
    }
    
    // Build versions array starting with Latest
    const versions: FrameworkVersion[] = [
      { version: 'latest', label: 'Latest (Recommended)', phpMin: '7.4', subVersions: [] },
    ];
    
    // Add 6.x versions from API (sorted descending)
    Array.from(majorVersions.keys())
      .sort((a, b) => parseFloat(b) - parseFloat(a))
      .forEach(major => {
        versions.push({
          version: major,
          label: `WordPress ${major}`,
          phpMin: '7.4',
          subVersions: [],
        });
      });
    
    // Add 4.x and 5.x versions from static JSON data
    const wpData = legacyVersions.wordpress as Record<string, { label: string; phpMin: string; subVersions: string[] }>;
    Object.keys(wpData)
      .sort((a, b) => parseFloat(b) - parseFloat(a))
      .forEach(major => {
        const data = wpData[major];
        versions.push({
          version: major,
          label: data.label,
          phpMin: data.phpMin,
          subVersions: data.subVersions,
        });
      });
    
    return versions.length > 1 ? versions : FRAMEWORK_VERSIONS.wordpress;
  } catch (error) {
    console.error('Failed to fetch WordPress versions:', error);
    // Return fallback with legacy versions
    const versions: FrameworkVersion[] = [...FRAMEWORK_VERSIONS.wordpress];
    const wpData = legacyVersions.wordpress as Record<string, { label: string; phpMin: string; subVersions: string[] }>;
    Object.keys(wpData)
      .sort((a, b) => parseFloat(b) - parseFloat(a))
      .forEach(major => {
        const data = wpData[major];
        if (!versions.find(v => v.version === major)) {
          versions.push({
            version: major,
            label: data.label,
            phpMin: data.phpMin,
            subVersions: data.subVersions,
          });
        }
      });
    return versions;
  }
}

// Node.js version info interface
interface NodeVersionInfo {
  major: number;
  version: string;
  lts: string | false;
  subVersions: string[];
}

// Installation commands for each source type - now with version support
const getInstallCommands = (
  sourceId: SourceType, 
  projectName: string, 
  installInPlace: boolean, 
  frameworkVersion?: string,
  subVersion?: string,
  npmVersion?: string
): string[] => {
  const name = installInPlace ? '.' : projectName;
  
  // Handle versioned PHP frameworks
  if (sourceId === 'laravel' && frameworkVersion) {
    // Use exact version if subVersion provided (e.g., "v10.3.3"), otherwise use major constraint
    const versionConstraint = subVersion ? `v${subVersion}` : `^${frameworkVersion}.0`;
    return installInPlace ? [
      `COMPOSER_ALLOW_SUPERUSER=1 composer create-project laravel/laravel temp_laravel_install "${versionConstraint}"`,
      `mv temp_laravel_install/* temp_laravel_install/.[!.]* . 2>/dev/null || true`,
      `rm -rf temp_laravel_install`,
      `COMPOSER_ALLOW_SUPERUSER=1 composer install`,
    ] : [
      `COMPOSER_ALLOW_SUPERUSER=1 composer create-project laravel/laravel ${name} "${versionConstraint}"`,
      `cd ${name} && COMPOSER_ALLOW_SUPERUSER=1 composer install`,
    ];
  }
  
  if (sourceId === 'symfony' && frameworkVersion) {
    // Use sub-version if available, otherwise use major.minor constraint
    const versionConstraint = subVersion ? `${subVersion}.*` :
                              frameworkVersion.startsWith('8') ? `${frameworkVersion}.*` :
                              frameworkVersion.startsWith('7') ? `${frameworkVersion}.*` : 
                              frameworkVersion === '6.4' ? '6.4.*' : '5.4.*';
    return installInPlace ? [
      `COMPOSER_ALLOW_SUPERUSER=1 composer create-project symfony/skeleton:"${versionConstraint}" temp_symfony_install`,
      `mv temp_symfony_install/* temp_symfony_install/.[!.]* . 2>/dev/null || true`,
      `rm -rf temp_symfony_install`,
      `COMPOSER_ALLOW_SUPERUSER=1 composer require webapp`,
    ] : [
      `COMPOSER_ALLOW_SUPERUSER=1 composer create-project symfony/skeleton:"${versionConstraint}" ${name}`,
      `cd ${name} && COMPOSER_ALLOW_SUPERUSER=1 composer require webapp`,
    ];
  }
  
  if (sourceId === 'codeigniter' && frameworkVersion) {
    if (frameworkVersion === '3') {
      // Use subVersion if available, default to 3.1.13
      const ciVersion = subVersion || '3.1.13';
      return installInPlace ? [
        `curl -L https://github.com/bcit-ci/CodeIgniter/archive/refs/tags/${ciVersion}.tar.gz -o ci.tar.gz`,
        `tar -xzf ci.tar.gz --strip-components=1`,
        `rm ci.tar.gz`,
      ] : [
        `mkdir -p ${name}`,
        `cd ${name} && curl -L https://github.com/bcit-ci/CodeIgniter/archive/refs/tags/${ciVersion}.tar.gz -o ci.tar.gz`,
        `cd ${name} && tar -xzf ci.tar.gz --strip-components=1`,
        `cd ${name} && rm ci.tar.gz`,
      ];
    }
    // CI4 - use specific version if available
    const ci4Version = subVersion ? `:"${subVersion}"` : '';
    return installInPlace ? [
      `COMPOSER_ALLOW_SUPERUSER=1 composer create-project codeigniter4/appstarter${ci4Version} temp_ci4_install`,
      `mv temp_ci4_install/* temp_ci4_install/.[!.]* . 2>/dev/null || true`,
      `rm -rf temp_ci4_install`,
    ] : [
      `COMPOSER_ALLOW_SUPERUSER=1 composer create-project codeigniter4/appstarter${ci4Version} ${name}`,
    ];
  }
  
  if (sourceId === 'wordpress' && frameworkVersion) {
    // Use subVersion for specific version (e.g., 6.7.1), otherwise use major version
    const wpVersion = subVersion || frameworkVersion;
    const wpUrl = wpVersion === 'latest' 
      ? 'https://wordpress.org/latest.tar.gz'
      : `https://wordpress.org/wordpress-${wpVersion}.tar.gz`;
    return installInPlace ? [
      `curl -O ${wpUrl}`,
      `tar -xzf *.tar.gz --strip-components=1`,
      `rm *.tar.gz`,
    ] : [
      `mkdir -p ${name}`,
      `cd ${name} && curl -O ${wpUrl}`,
      `cd ${name} && tar -xzf *.tar.gz --strip-components=1`,
      `cd ${name} && rm *.tar.gz`,
    ];
  }
  
  // Handle Node.js frameworks with optional npm version
  const npmVersionSuffix = npmVersion ? `@${npmVersion}` : '';
  
  // Non-versioned frameworks
  const commands: Record<string, string[]> = {
    'nodejs-express': installInPlace ? [
      `npm init -y`,
      `npm install express${npmVersionSuffix}`,
      `echo "const express = require('express');\\nconst app = express();\\nconst PORT = process.env.PORT || 3000;\\n\\napp.get('/', (req, res) => res.send('Hello World!'));\\n\\napp.listen(PORT, () => console.log(\\\`Server running on port \\\${PORT}\\\`));" > index.js`,
    ] : [
      `mkdir -p ${name}`,
      `cd ${name} && npm init -y`,
      `cd ${name} && npm install express${npmVersionSuffix}`,
      `cd ${name} && echo "const express = require('express');\\nconst app = express();\\nconst PORT = process.env.PORT || 3000;\\n\\napp.get('/', (req, res) => res.send('Hello World!'));\\n\\napp.listen(PORT, () => console.log(\\\`Server running on port \\\${PORT}\\\`));" > index.js`,
    ],
    'nodejs-nestjs': installInPlace ? [
      `npx @nestjs/cli${npmVersionSuffix} new temp_nest_install --skip-git --package-manager npm`,
      `mv temp_nest_install/* temp_nest_install/.[!.]* . 2>/dev/null || true`,
      `rm -rf temp_nest_install`,
    ] : [
      `npx @nestjs/cli${npmVersionSuffix} new ${name} --skip-git --package-manager npm`,
    ],
    'nodejs-fastify': installInPlace ? [
      `npm init -y`,
      `npm install fastify${npmVersionSuffix}`,
      `echo "const fastify = require('fastify')({ logger: true });\\n\\nfastify.get('/', async () => ({ hello: 'world' }));\\n\\nfastify.listen({ port: 3000 }, (err) => {\\n  if (err) throw err;\\n});" > index.js`,
    ] : [
      `mkdir -p ${name}`,
      `cd ${name} && npm init -y`,
      `cd ${name} && npm install fastify${npmVersionSuffix}`,
      `cd ${name} && echo "const fastify = require('fastify')({ logger: true });\\n\\nfastify.get('/', async () => ({ hello: 'world' }));\\n\\nfastify.listen({ port: 3000 }, (err) => {\\n  if (err) throw err;\\n});" > index.js`,
    ],
    'vuejs': installInPlace ? [
      `npm create vite@latest temp_vue_install -- --template vue`,
      `mv temp_vue_install/* temp_vue_install/.[!.]* . 2>/dev/null || true`,
      `rm -rf temp_vue_install`,
      npmVersion ? `npm install vue@${npmVersion}` : `npm install`,
    ] : [
      `npm create vite@latest ${name} -- --template vue`,
      npmVersion ? `cd ${name} && npm install vue@${npmVersion}` : `cd ${name} && npm install`,
    ],
    'vuejs-nuxt': installInPlace ? [
      `npx nuxi@latest init temp_nuxt_install`,
      `mv temp_nuxt_install/* temp_nuxt_install/.[!.]* . 2>/dev/null || true`,
      `rm -rf temp_nuxt_install`,
      npmVersion ? `npm install nuxt@${npmVersion}` : `npm install`,
    ] : [
      `npx nuxi@latest init ${name}`,
      npmVersion ? `cd ${name} && npm install nuxt@${npmVersion}` : `cd ${name} && npm install`,
    ],
    'react': installInPlace ? [
      `npm create vite@latest temp_react_install -- --template react`,
      `mv temp_react_install/* temp_react_install/.[!.]* . 2>/dev/null || true`,
      `rm -rf temp_react_install`,
      npmVersion ? `npm install react@${npmVersion} react-dom@${npmVersion}` : `npm install`,
    ] : [
      `npm create vite@latest ${name} -- --template react`,
      npmVersion ? `cd ${name} && npm install react@${npmVersion} react-dom@${npmVersion}` : `cd ${name} && npm install`,
    ],
    'react-nextjs': installInPlace ? [
      `npx create-next-app@${npmVersion || 'latest'} temp_next_install --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`,
      `mv temp_next_install/* temp_next_install/.[!.]* . 2>/dev/null || true`,
      `rm -rf temp_next_install`,
    ] : [
      `npx create-next-app@${npmVersion || 'latest'} ${name} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`,
    ],
    'typescript-node': installInPlace ? [
      `npm init -y`,
      `npm install typescript${npmVersionSuffix} ts-node @types/node -D`,
      `npx tsc --init`,
      `echo "console.log('Hello TypeScript!');" > index.ts`,
    ] : [
      `mkdir -p ${name}`,
      `cd ${name} && npm init -y`,
      `cd ${name} && npm install typescript${npmVersionSuffix} ts-node @types/node -D`,
      `cd ${name} && npx tsc --init`,
      `cd ${name} && echo "console.log('Hello TypeScript!');" > index.ts`,
    ],
  };
  
  return commands[sourceId] || [];
};

// Database config templates
const DB_CONFIG_TEMPLATES: Record<string, (db: DbCredentials) => string> = {
  'env': (db) => `
DB_CONNECTION=${db.type || 'mysql'}
DB_HOST=${db.host}
DB_PORT=${db.port}
DB_DATABASE=${db.database}
DB_USERNAME=${db.username}
DB_PASSWORD=${db.password}
`,
  'wp-config': (db) => `
define('DB_NAME', '${db.database}');
define('DB_USER', '${db.username}');
define('DB_PASSWORD', '${db.password}');
define('DB_HOST', '${db.host}');
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');
`,
  'ci3-db': (db) => `
$db['default'] = array(
    'dsn'   => '',
    'hostname' => '${db.host}',
    'username' => '${db.username}',
    'password' => '${db.password}',
    'database' => '${db.database}',
    'dbdriver' => '${db.type || 'mysqli'}',
    'dbprefix' => '',
    'pconnect' => FALSE,
    'db_debug' => (ENVIRONMENT !== 'production'),
    'cache_on' => FALSE,
    'cachedir' => '',
    'char_set' => 'utf8',
    'dbcollat' => 'utf8_general_ci',
    'swap_pre' => '',
    'encrypt' => FALSE,
    'compress' => FALSE,
    'stricton' => FALSE,
    'failover' => array(),
    'save_queries' => TRUE
);
`,
};

interface DbCredentials {
  type: 'mysql' | 'pgsql' | 'sqlite' | 'sqlsrv';
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  targetPath: string;
  onInstallComplete?: () => void;
}

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'command' | 'warning';
  message: string;
  timestamp: Date;
}

interface DependencyStatus {
  composer: boolean | null;
  composerVersion: string;
  node: boolean | null;
  nodeVersion: string;
  nvm: boolean | null;
  npm: boolean | null;
  npmVersion: string;
}

const SourceInstaller: React.FC<Props> = ({ isOpen, onClose, connectionId, targetPath, onInstallComplete }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<'select' | 'version' | 'config' | 'deps' | 'installing' | 'complete'>('select');
  const [selectedSource, setSelectedSource] = useState<SourceOption | null>(null);
  const [projectName, setProjectName] = useState('my-project');
  const [installInPlace, setInstallInPlace] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'PHP' | 'JavaScript' | 'TypeScript'>('all');
  
  // Framework version selection (for PHP frameworks)
  const [selectedFrameworkVersion, setSelectedFrameworkVersion] = useState<FrameworkVersion | null>(null);
  const [selectedSubVersion, setSelectedSubVersion] = useState<string>('');
  const [loadingSubVersions, setLoadingSubVersions] = useState(false);
  const [loadingMajorVersions, setLoadingMajorVersions] = useState(false);
  const [serverPhpVersion, setServerPhpVersion] = useState<string>('');
  const [checkingPhpVersion, setCheckingPhpVersion] = useState(false);
  const [phpVersionError, setPhpVersionError] = useState<string>('');
  const [dynamicFrameworkVersions, setDynamicFrameworkVersions] = useState<Record<string, FrameworkVersion[]>>(FRAMEWORK_VERSIONS);
  
  // Node.js version selection (for Node.js frameworks)
  const [npmPackageVersions, setNpmPackageVersions] = useState<string[]>([]);
  const [selectedNpmVersion, setSelectedNpmVersion] = useState<string>('');
  const [loadingNpmVersions, setLoadingNpmVersions] = useState(false);
  
  // Node.js version selection
  const [selectedNodeVersion, setSelectedNodeVersion] = useState('');
  const [availableNodeVersions, setAvailableNodeVersions] = useState<NodeVersionInfo[]>([]);
  const [loadingNodeVersions, setLoadingNodeVersions] = useState(false);
  const [expandedMajor, setExpandedMajor] = useState<number | null>(null);
  
  // Dependency status
  const [deps, setDeps] = useState<DependencyStatus>({
    composer: null,
    composerVersion: '',
    node: null,
    nodeVersion: '',
    nvm: null,
    npm: null,
    npmVersion: '',
  });
  const [checkingDeps, setCheckingDeps] = useState(false);
  
  // Database credentials
  const [dbEnabled, setDbEnabled] = useState(false);
  const [dbCredentials, setDbCredentials] = useState<DbCredentials>({
    type: 'mysql',
    host: 'localhost',
    port: '3306',
    database: '',
    username: 'root',
    password: '',
  });
  
  // Installation progress
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCommand, setCurrentCommand] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const xtermLogRef = useRef<XTermLogViewerRef>(null);
  
  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedSource(null);
      setSelectedFrameworkVersion(null);
      setSelectedSubVersion('');
      setServerPhpVersion('');
      setPhpVersionError('');
      setProjectName('my-project');
      setInstallInPlace(false);
      setDbEnabled(false);
      setLogs([]);
      setProgress(0);
      setNpmPackageVersions([]);
      setSelectedNpmVersion('');
      setDeps({
        composer: null, composerVersion: '',
        node: null, nodeVersion: '',
        nvm: null, npm: null, npmVersion: '',
      });
      // Clear xterm log viewer
      xtermLogRef.current?.clear();
    }
  }, [isOpen]);
  
  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
    // Also write to xterm with proper color codes
    if (xtermLogRef.current) {
      const colorCode = type === 'error' ? '\x1b[31m' :
                        type === 'success' ? '\x1b[32m' :
                        type === 'command' ? '\x1b[33m' :
                        type === 'warning' ? '\x1b[38;5;208m' : '';
      const resetCode = colorCode ? '\x1b[0m' : '';
      xtermLogRef.current.writeln(`${colorCode}${message}${resetCode}`);
    }
  };
  
  // Check server PHP version
  const checkPhpVersion = async () => {
    setCheckingPhpVersion(true);
    try {
      const result = await ipcRenderer.invoke('ssh:execute', connectionId, 'php -v 2>/dev/null | head -1');
      if (result.success && result.output) {
        const match = result.output.match(/PHP (\d+\.\d+\.\d+)/);
        if (match) {
          setServerPhpVersion(match[1]);
          return match[1];
        }
      }
      setServerPhpVersion('');
      return '';
    } catch (error) {
      console.error('Error checking PHP version:', error);
      setServerPhpVersion('');
      return '';
    } finally {
      setCheckingPhpVersion(false);
    }
  };
  
  // Compare version strings (e.g., "8.2.0" >= "8.1")
  const compareVersions = (current: string, required: string): number => {
    const curr = current.split('.').map(n => parseInt(n) || 0);
    const req = required.split('.').map(n => parseInt(n) || 0);
    
    for (let i = 0; i < Math.max(curr.length, req.length); i++) {
      const c = curr[i] || 0;
      const r = req[i] || 0;
      if (c > r) return 1;
      if (c < r) return -1;
    }
    return 0;
  };
  
  // Check if PHP version meets framework requirements
  const checkFrameworkPhpRequirements = (ver: FrameworkVersion, phpVersion: string): { compatible: boolean; message: string } => {
    if (!phpVersion) {
      return { compatible: false, message: 'PHP is not installed' };
    }
    
    // Check minimum version
    if (compareVersions(phpVersion, ver.phpMin) < 0) {
      return { 
        compatible: false, 
        message: `Requires PHP ${ver.phpMin}+` 
      };
    }
    
    // Check maximum version if specified
    if (ver.phpMax && compareVersions(phpVersion, ver.phpMax) > 0) {
      return { 
        compatible: false, 
        message: `Requires PHP ≤ ${ver.phpMax}` 
      };
    }
    
    return { compatible: true, message: '' };
  };
  
  const filteredSources = SOURCE_OPTIONS.filter(
    s => categoryFilter === 'all' || s.category === categoryFilter
  );
  
  // Fetch available Node.js versions from nodejs.org API
  const fetchNodeVersions = async () => {
    setLoadingNodeVersions(true);
    try {
      // Fetch from Node.js official API
      const response = await fetch('https://nodejs.org/dist/index.json');
      const data = await response.json();
      
      // Group by major version
      const versionMap = new Map<number, NodeVersionInfo>();
      
      for (const item of data) {
        const version = item.version.replace('v', '');
        const major = parseInt(version.split('.')[0]);
        
        // Only show versions >= 16
        if (major < 16) continue;
        
        if (!versionMap.has(major)) {
          versionMap.set(major, {
            major,
            version: version, // Latest version of this major
            lts: item.lts || false,
            subVersions: [version],
          });
        } else {
          const existing = versionMap.get(major)!;
          // Add to subVersions (limit to 10 most recent)
          if (existing.subVersions.length < 10) {
            existing.subVersions.push(version);
          }
        }
      }
      
      // Convert to array and sort by major version descending
      const versions = Array.from(versionMap.values()).sort((a, b) => b.major - a.major);
      setAvailableNodeVersions(versions);
      
      // Default to Node 20 LTS if available
      const defaultVersion = versions.find(v => v.major === 20) || versions[0];
      if (defaultVersion) {
        setSelectedNodeVersion(defaultVersion.version);
      }
    } catch (error) {
      console.error('Failed to fetch Node versions:', error);
      // Fallback to hardcoded versions
      setAvailableNodeVersions([
        { major: 22, version: '22.0.0', lts: false, subVersions: ['22.0.0'] },
        { major: 20, version: '20.11.0', lts: 'Iron', subVersions: ['20.11.0', '20.10.0'] },
        { major: 18, version: '18.19.0', lts: 'Hydrogen', subVersions: ['18.19.0', '18.18.0'] },
      ]);
    }
    setLoadingNodeVersions(false);
  };
  
  // Check dependencies on server
  const checkDependencies = async () => {
    setCheckingDeps(true);
    const newDeps: DependencyStatus = {
      composer: null, composerVersion: '',
      node: null, nodeVersion: '',
      nvm: null, npm: null, npmVersion: '',
    };
    
    try {
      // Check Composer
      const composerResult = await ipcRenderer.invoke('ssh:execute', connectionId, 'composer --version 2>/dev/null');
      if (composerResult.success && composerResult.output?.includes('Composer')) {
        newDeps.composer = true;
        const match = composerResult.output.match(/Composer version (\d+\.\d+\.\d+)/);
        newDeps.composerVersion = match ? match[1] : 'installed';
      } else {
        newDeps.composer = false;
      }
      
      // Check NVM
      const nvmResult = await ipcRenderer.invoke('ssh:execute', connectionId, 
        'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm --version 2>/dev/null'
      );
      newDeps.nvm = nvmResult.success && nvmResult.output?.match(/\d+\.\d+/);
      
      // Check Node.js
      const nodeResult = await ipcRenderer.invoke('ssh:execute', connectionId, 
        'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" 2>/dev/null; node --version 2>/dev/null'
      );
      if (nodeResult.success && nodeResult.output?.startsWith('v')) {
        newDeps.node = true;
        newDeps.nodeVersion = nodeResult.output.trim();
      } else {
        newDeps.node = false;
      }
      
      // Check NPM
      const npmResult = await ipcRenderer.invoke('ssh:execute', connectionId, 
        'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" 2>/dev/null; npm --version 2>/dev/null'
      );
      if (npmResult.success && npmResult.output?.match(/\d+\.\d+/)) {
        newDeps.npm = true;
        newDeps.npmVersion = npmResult.output.trim();
      } else {
        newDeps.npm = false;
      }
      
      // Fetch Node versions if Node.js is required and not installed
      if (selectedSource?.requiresNode && !newDeps.node) {
        await fetchNodeVersions();
      }
      
    } catch (error) {
      console.error('Error checking dependencies:', error);
    }
    
    setDeps(newDeps);
    setCheckingDeps(false);
  };
  
  const handleSelectSource = async (source: SourceOption) => {
    setSelectedSource(source);
    setDbEnabled(source.requiresDb || false);
    setProjectName(source.id.replace(/[-_]/g, '_').split('_')[0] + '_app');
    setSelectedFrameworkVersion(null);
    setSelectedSubVersion('');
    setPhpVersionError('');
    setNpmPackageVersions([]);
    setSelectedNpmVersion('');
    
    // If framework has versions, go to version selection step
    if (source.hasVersions) {
      // Check PHP version first for PHP frameworks
      if (source.category === 'PHP') {
        await checkPhpVersion();
        setStep('version');
        
        // Fetch dynamic versions for frameworks that support it
        if (source.dynamicVersions) {
          setLoadingMajorVersions(true);
          try {
            let versions: FrameworkVersion[] = [];
            if (source.id === 'laravel') {
              versions = await fetchLaravelMajorVersions();
            } else if (source.id === 'wordpress') {
              versions = await fetchWordPressMajorVersions();
            }
            if (versions.length > 0) {
              setDynamicFrameworkVersions(prev => ({
                ...prev,
                [source.id]: versions,
              }));
            }
          } catch (error) {
            console.error('Failed to fetch dynamic versions:', error);
          }
          setLoadingMajorVersions(false);
        }
      } else if (source.requiresNode && NPM_PACKAGE_MAP[source.id]) {
        // Fetch npm package versions for Node.js frameworks
        setStep('version');
        setLoadingNpmVersions(true);
        const versions = await fetchNpmVersions(NPM_PACKAGE_MAP[source.id]);
        setNpmPackageVersions(versions);
        if (versions.length > 0) {
          setSelectedNpmVersion(versions[0]); // Select latest by default
        }
        setLoadingNpmVersions(false);
      } else {
        setStep('config');
      }
    } else {
      setStep('config');
    }
  };
  
  // Handle version selection for frameworks
  const handleSelectVersion = async (ver: FrameworkVersion) => {
    setSelectedFrameworkVersion(ver);
    setSelectedSubVersion('');
    setPhpVersionError('');
    
    // Fetch sub-versions dynamically
    if (selectedSource) {
      setLoadingSubVersions(true);
      const subVersions = await fetchFrameworkSubVersions(selectedSource.id, ver.version);
      
      // Update the version with fetched sub-versions
      const updatedVer = { ...ver, subVersions };
      setSelectedFrameworkVersion(updatedVer);
      
      // Auto-select first sub-version if available
      if (subVersions.length > 0) {
        setSelectedSubVersion(subVersions[0]);
      }
      setLoadingSubVersions(false);
    }
  };
  
  // Handle sub-version selection
  const handleSelectSubVersion = (subVersion: string) => {
    setSelectedSubVersion(subVersion);
  };
  
  // Continue from version selection to config
  const handleVersionContinue = () => {
    // For PHP frameworks, check version selection
    if (selectedSource?.category === 'PHP') {
      if (!selectedFrameworkVersion) return;
      
      // Double-check PHP compatibility
      const phpCheck = checkFrameworkPhpRequirements(selectedFrameworkVersion, serverPhpVersion);
      if (!phpCheck.compatible) {
        setPhpVersionError(phpCheck.message);
        return;
      }
    }
    
    // For Node.js frameworks, no special validation needed
    setStep('config');
  };
  
  const [continueLoading, setContinueLoading] = useState(false);
  
  const handleContinueToInstall = async () => {
    if (!selectedSource || continueLoading) return;
    
    setContinueLoading(true);
    try {
      // Check dependencies
      await checkDependencies();
      
      // If dependencies needed, go to deps step
      if (selectedSource.requiresComposer || selectedSource.requiresNode) {
        setStep('deps');
      } else {
        await startInstallation();
      }
    } finally {
      setContinueLoading(false);
    }
  };
  
  // Install Composer
  const installComposer = async () => {
    addLog('info', '📦 Installing Composer...');
    setIsInstalling(true);
    
    const commands = [
      'php -r "copy(\'https://getcomposer.org/installer\', \'composer-setup.php\');"',
      'php composer-setup.php --install-dir=/usr/local/bin --filename=composer 2>/dev/null || php composer-setup.php --install-dir=$HOME/.local/bin --filename=composer',
      'rm composer-setup.php',
      'export PATH="$HOME/.local/bin:$PATH"',
    ];
    
    for (const cmd of commands) {
      addLog('command', `$ ${cmd}`);
      const result = await ipcRenderer.invoke('ssh:execute', connectionId, cmd);
      if (result.output) {
        addLog('info', result.output.slice(0, 500));
      }
    }
    
    // Re-check
    await checkDependencies();
    setIsInstalling(false);
    addLog('success', '✓ Composer installation completed');
  };
  
  // Install NVM and Node.js
  const installNodeViaOrWithNvm = async () => {
    setIsInstalling(true);
    
    // First check if NVM is installed
    if (!deps.nvm) {
      addLog('info', '📦 Installing NVM (Node Version Manager)...');
      
      const nvmInstallCmd = 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash';
      addLog('command', `$ ${nvmInstallCmd}`);
      
      const result = await ipcRenderer.invoke('ssh:execute', connectionId, nvmInstallCmd);
      if (result.output) {
        const lines = result.output.split('\n').slice(-5);
        lines.forEach((line: string) => line.trim() && addLog('info', line));
      }
      
      addLog('success', '✓ NVM installed');
    }
    
    // Install selected Node.js version
    addLog('info', `📦 Installing Node.js ${selectedNodeVersion} via NVM...`);
    
    const nodeInstallCmd = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm install ${selectedNodeVersion} && nvm use ${selectedNodeVersion} && nvm alias default ${selectedNodeVersion}`;
    addLog('command', `$ nvm install ${selectedNodeVersion}`);
    
    const nodeResult = await ipcRenderer.invoke('ssh:execute', connectionId, nodeInstallCmd);
    if (nodeResult.output) {
      const lines = nodeResult.output.split('\n').slice(-8);
      lines.forEach((line: string) => line.trim() && addLog('info', line));
    }
    
    // Re-check dependencies
    await checkDependencies();
    setIsInstalling(false);
    addLog('success', `✓ Node.js ${selectedNodeVersion} installed`);
  };
  
  const canProceed = () => {
    if (!selectedSource) return false;
    if (selectedSource.requiresComposer && !deps.composer) return false;
    if (selectedSource.requiresNode && !deps.node) return false;
    return true;
  };
  
  const startInstallation = async () => {
    if (!selectedSource) return;
    
    setStep('installing');
    setIsInstalling(true);
    setLogs([]);
    setProgress(0);
    xtermLogRef.current?.clear();
    
    // Generate unique stream ID for this installation
    const streamId = `install-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Set up streaming data listener
    const streamHandler = (_event: any, sid: string, data: string, isError: boolean) => {
      if (sid !== streamId) return;
      // Write data directly to xterm for realtime display
      xtermLogRef.current?.write(data);
    };
    
    ipcRenderer.on('ssh:streamData', streamHandler);
    
    try {
      const projectPath = installInPlace ? targetPath : `${targetPath}/${projectName}`;
      
      // Determine display name with version info
      let displayName = selectedSource.name;
      if (selectedFrameworkVersion) {
        displayName = selectedSubVersion 
          ? `${selectedSource.name} ${selectedSubVersion}`
          : `${selectedSource.name} ${selectedFrameworkVersion.label}`;
      } else if (selectedNpmVersion) {
        displayName = `${selectedSource.name} v${selectedNpmVersion}`;
      }
      
      addLog('info', `🚀 Starting installation of ${displayName}...`);
      addLog('info', `📁 Target directory: ${projectPath}`);
      addLog('info', installInPlace ? '📌 Installing directly in current folder' : `📂 Creating subfolder: ${projectName}`);
      
      // NVM prefix for Node.js commands
      const nvmPrefix = selectedSource.requiresNode 
        ? 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
        : '';
      
      // Composer path prefix
      const composerPrefix = selectedSource.requiresComposer
        ? 'export PATH="$HOME/.local/bin:$PATH" && '
        : '';
      
      const commands = getInstallCommands(
        selectedSource.id, 
        projectName, 
        installInPlace, 
        selectedFrameworkVersion?.version,
        selectedSubVersion,
        selectedNpmVersion
      );
      const totalCommands = commands.length + (dbEnabled ? 1 : 0);
      let completedCommands = 0;
      
      // Change to target directory first
      addLog('command', `cd ${targetPath}`);
      xtermLogRef.current?.writeln(`\x1b[36m$ cd ${targetPath}\x1b[0m`);
      
      for (const cmd of commands) {
        setCurrentCommand(cmd);
        addLog('command', `$ ${cmd}`);
        xtermLogRef.current?.writeln(`\x1b[36m$ ${cmd}\x1b[0m`);
        
        try {
          // Execute command via SSH with streaming output
          const fullCmd = `cd ${targetPath} && ${nvmPrefix}${composerPrefix}${cmd}`;
          const result = await ipcRenderer.invoke('ssh:executeStream', connectionId, fullCmd, streamId);
          
          if (result.success) {
            xtermLogRef.current?.writeln(`\x1b[32m✓ Command completed successfully\x1b[0m`);
            addLog('success', `✓ Command completed successfully`);
          } else {
            xtermLogRef.current?.writeln(`\x1b[31m✗ Command failed with exit code ${result.exitCode}\x1b[0m`);
            addLog('error', `✗ Command failed with exit code ${result.exitCode}`);
          }
        } catch (err: any) {
          xtermLogRef.current?.writeln(`\x1b[31m✗ Failed: ${err.message}\x1b[0m`);
          addLog('error', `✗ Failed: ${err.message}`);
        }
        
        completedCommands++;
        setProgress(Math.round((completedCommands / totalCommands) * 100));
      }
      
      // Configure database if enabled
      if (dbEnabled && selectedSource.dbConfigFile) {
        addLog('info', '⚙️ Configuring database...');
        xtermLogRef.current?.writeln(`\x1b[33m⚙️ Configuring database...\x1b[0m`);
        await configureDatabase(selectedSource, projectPath);
        completedCommands++;
        setProgress(100);
      }
      
      addLog('success', `\n🎉 ${displayName} installed successfully!`);
      addLog('info', `📂 Project location: ${projectPath}`);
      xtermLogRef.current?.writeln(`\n\x1b[32;1m🎉 ${displayName} installed successfully!\x1b[0m`);
      xtermLogRef.current?.writeln(`\x1b[34m📂 Project location: ${projectPath}\x1b[0m`);
      
      if (selectedSource.requiresNode) {
        addLog('info', `💡 Run 'npm run dev' or 'npm start' to start the development server`);
        xtermLogRef.current?.writeln(`\x1b[33m💡 Run 'npm run dev' or 'npm start' to start the development server\x1b[0m`);
      }
      if (selectedSource.id === 'laravel' || selectedSource.id === 'symfony') {
        addLog('info', `💡 Run 'php artisan serve' to start the development server`);
        xtermLogRef.current?.writeln(`\x1b[33m💡 Run 'php artisan serve' to start the development server\x1b[0m`);
      }
      
      setStep('complete');
    } catch (error: any) {
      addLog('error', `Installation failed: ${error.message}`);
      xtermLogRef.current?.writeln(`\x1b[31;1mInstallation failed: ${error.message}\x1b[0m`);
    } finally {
      // Clean up stream listener
      ipcRenderer.removeListener('ssh:streamData', streamHandler);
      setIsInstalling(false);
      setCurrentCommand('');
    }
  };
  
  const configureDatabase = async (source: SourceOption, projectPath: string) => {
    switch (source.id) {
      case 'wordpress':
        addLog('command', `cp wp-config-sample.php wp-config.php`);
        await ipcRenderer.invoke('ssh:execute', connectionId,
          `cd ${projectPath} && cp wp-config-sample.php wp-config.php 2>/dev/null || true`
        );
        
        const wpCommands = [
          `sed -i "s/database_name_here/${dbCredentials.database}/g" wp-config.php`,
          `sed -i "s/username_here/${dbCredentials.username}/g" wp-config.php`,
          `sed -i "s/password_here/${dbCredentials.password}/g" wp-config.php`,
          `sed -i "s/localhost/${dbCredentials.host}/g" wp-config.php`,
        ];
        
        for (const cmd of wpCommands) {
          await ipcRenderer.invoke('ssh:execute', connectionId, `cd ${projectPath} && ${cmd}`);
        }
        
        addLog('info', 'Generating security keys...');
        addLog('success', '✓ WordPress database configured');
        return;
        
      case 'codeigniter':
        // Check version to determine config method
        const ciVersion = selectedFrameworkVersion?.version || '4';
        if (ciVersion.startsWith('3')) {
          // CodeIgniter 3 uses database.php config
          const ci3Config = DB_CONFIG_TEMPLATES['ci3-db'](dbCredentials);
          const configFile = `${projectPath}/application/config/database.php`;
          const ci3Cmd = `cat > ${configFile} << 'DBCONFIG'
<?php
defined('BASEPATH') OR exit('No direct script access allowed');
${ci3Config}
DBCONFIG`;
          await ipcRenderer.invoke('ssh:execute', connectionId, ci3Cmd);
          addLog('success', '✓ CodeIgniter 3 database configured');
        } else {
          // CodeIgniter 4 uses .env file
          const configContent = DB_CONFIG_TEMPLATES['env'](dbCredentials);
          const envCmd = `cd ${projectPath} && cat >> .env << 'ENVCONFIG'
${configContent}
ENVCONFIG`;
          await ipcRenderer.invoke('ssh:execute', connectionId, envCmd);
          addLog('success', '✓ CodeIgniter 4 database configured');
        }
        return;
        
      default:
        if (source.dbConfigFormat === 'env') {
          const configContent = DB_CONFIG_TEMPLATES['env'](dbCredentials);
          const envCmd = `cd ${projectPath} && cat >> .env << 'ENVCONFIG'
${configContent}
ENVCONFIG`;
          await ipcRenderer.invoke('ssh:execute', connectionId, envCmd);
          addLog('success', '✓ Database credentials added to .env');
        }
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 rounded-xl shadow-2xl border border-navy-600 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-600">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <h2 className="text-lg font-semibold text-white">{t('sourceInstallerTitle')}</h2>
              <p className="text-sm text-gray-400">{t('sourceInstallerDesc')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-navy-700 transition"
            disabled={isInstalling}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Source */}
          {step === 'select' && (
            <div>
              <div className="flex gap-2 mb-4">
                {(['all', 'PHP', 'JavaScript', 'TypeScript'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-2 rounded-lg transition ${
                      categoryFilter === cat
                        ? 'bg-teal-600 text-white'
                        : 'bg-navy-700 text-gray-400 hover:bg-navy-600'
                    }`}
                  >
                    {cat === 'all' ? t('all') : cat}
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredSources.map(source => (
                  <button
                    key={source.id}
                    onClick={() => handleSelectSource(source)}
                    className="p-4 bg-navy-700 hover:bg-navy-600 rounded-lg text-left transition group border border-transparent hover:border-teal-500"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 flex items-center justify-center">
                        {getFrameworkIcon(source.id, 28)}
                      </div>
                      <span className="font-medium text-white group-hover:text-teal-400">{source.name}</span>
                    </div>
                    <p className="text-sm text-gray-400">{t(source.descriptionKey as any)}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        source.category === 'PHP' ? 'bg-purple-500/20 text-purple-400' :
                        source.category === 'JavaScript' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {source.category}
                      </span>
                      {source.requiresDb && (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">Database</span>
                      )}
                      {source.requiresComposer && (
                        <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">Composer</span>
                      )}
                      {source.requiresNode && (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">Node.js</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Step 1.5: Version Selection (for frameworks with multiple versions) */}
          {step === 'version' && selectedSource && (
            <div className="space-y-6">
              {/* Selected Source */}
              <div className="flex items-center gap-4 p-4 bg-navy-700 rounded-lg">
                <div className="w-10 h-10 flex items-center justify-center">
                  {getFrameworkIcon(selectedSource.id, 32)}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{selectedSource.name}</h3>
                  <p className="text-sm text-gray-400">{t(selectedSource.descriptionKey as any)}</p>
                </div>
                <button onClick={() => { setStep('select'); setSelectedFrameworkVersion(null); setSelectedNpmVersion(''); }} className="ml-auto text-gray-400 hover:text-white">
                  {t('sourceChange')}
                </button>
              </div>
              
              {/* PHP Framework Version Selection */}
              {selectedSource.category === 'PHP' && (
                <>
                  {/* PHP Version Status */}
                  <div className="p-4 rounded-lg bg-navy-700 border border-gray-600">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🐘</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-300">{t('sourcePHPVersion')}</div>
                        {checkingPhpVersion ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            <span className="text-gray-400 text-sm">{t('sourceCheckingPHP')}</span>
                          </div>
                        ) : serverPhpVersion ? (
                          <div className="text-lg font-semibold text-green-400">{serverPhpVersion}</div>
                        ) : (
                          <div className="text-orange-400 text-sm">{t('sourcePHPNotDetected')}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Major Version Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-300">{t('sourceSelectMajorVersion')}</label>
                    {loadingMajorVersions ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <span className="ml-3 text-gray-400">{t('sourceLoadingVersions')}</span>
                      </div>
                    ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {dynamicFrameworkVersions[selectedSource.id]?.map((ver) => {
                        const phpCheck = checkFrameworkPhpRequirements(ver, serverPhpVersion);
                        const isSelected = selectedFrameworkVersion?.version === ver.version;
                        
                        return (
                          <button
                            key={ver.version}
                            onClick={() => phpCheck.compatible && handleSelectVersion(ver)}
                            disabled={!phpCheck.compatible || loadingSubVersions}
                            className={`
                              p-4 rounded-lg border-2 text-left transition-all relative
                              ${isSelected
                                ? 'border-blue-500 bg-blue-500/10'
                                : phpCheck.compatible
                                  ? 'border-gray-600 hover:border-gray-500 bg-navy-700'
                                  : 'border-red-500/30 bg-red-500/5 cursor-not-allowed opacity-60'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-white">{ver.label}</span>
                              {ver.lts && (
                                <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">LTS</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              PHP {ver.phpMin}{ver.phpMax ? ` - ${ver.phpMax}` : '+'}
                            </div>
                            {!phpCheck.compatible && phpCheck.message && (
                              <div className="text-xs text-red-400 mt-2">
                                ⚠️ {phpCheck.message}
                              </div>
                            )}
                            {isSelected && !loadingSubVersions && (
                              <div className="absolute top-2 right-2">
                                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            {isSelected && loadingSubVersions && (
                              <div className="absolute top-2 right-2">
                                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    )}
                  </div>
                  
                  {/* Sub-version Selection (Patch Versions) */}
                  {selectedFrameworkVersion && selectedFrameworkVersion.subVersions && selectedFrameworkVersion.subVersions.length > 0 && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-300">
                        {t('sourceSelectSpecificVersion')}
                      </label>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-600 bg-navy-700">
                        <div className="p-2">
                          {/* Option for latest/any in this major version */}
                          <button
                            onClick={() => handleSelectSubVersion('')}
                            className={`w-full p-2 rounded text-left mb-1 ${
                              !selectedSubVersion
                                ? 'bg-blue-500/20 border border-blue-500 text-blue-400'
                                : 'hover:bg-navy-600 text-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{t('sourceLatestRecommended')}</span>
                              <span className="text-xs text-gray-500">✓</span>
                            </div>
                          </button>
                          {/* List of specific versions */}
                          {selectedFrameworkVersion.subVersions.map((subVer) => (
                            <button
                              key={subVer}
                              onClick={() => handleSelectSubVersion(subVer)}
                              className={`w-full p-2 rounded text-left ${
                                selectedSubVersion === subVer
                                  ? 'bg-blue-500/20 border border-blue-500 text-blue-400'
                                  : 'hover:bg-navy-600 text-gray-300'
                              }`}
                            >
                              {subVer}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Node.js Framework Version Selection */}
              {selectedSource.requiresNode && NPM_PACKAGE_MAP[selectedSource.id] && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">
                    {t('sourceSelectNpmVersion').replace('{name}', selectedSource.name)}
                  </label>
                  {loadingNpmVersions ? (
                    <div className="flex items-center gap-3 p-4 bg-navy-700 rounded-lg">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span className="text-gray-400">{t('sourceFetchingVersions')}</span>
                    </div>
                  ) : npmPackageVersions.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-600 bg-navy-700">
                      <div className="p-2 space-y-1">
                        {npmPackageVersions.map((version, index) => (
                          <button
                            key={version}
                            onClick={() => setSelectedNpmVersion(version)}
                            className={`w-full p-3 rounded text-left flex items-center justify-between ${
                              selectedNpmVersion === version
                                ? 'bg-blue-500/20 border border-blue-500'
                                : 'hover:bg-navy-600 border border-transparent'
                            }`}
                          >
                            <span className={selectedNpmVersion === version ? 'text-blue-400 font-medium' : 'text-gray-300'}>
                              v{version}
                            </span>
                            {index === 0 && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">{t('sourceLatest')}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-navy-700 rounded-lg text-gray-400 text-center">
                      <p>{t('sourceCouldNotFetchVersions')}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* PHP Version Error */}
              {phpVersionError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  ⚠️ {phpVersionError}
                </div>
              )}
              
              {/* Continue Button */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setStep('select'); setSelectedFrameworkVersion(null); setSelectedNpmVersion(''); }}
                  className="w-1/2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"
                >
                  {t('sourceBack')}
                </button>
                <button
                  onClick={handleVersionContinue}
                  disabled={
                    (selectedSource.category === 'PHP' && (!selectedFrameworkVersion || checkingPhpVersion || loadingSubVersions)) ||
                    (selectedSource.requiresNode && !!NPM_PACKAGE_MAP[selectedSource.id] && loadingNpmVersions)
                  }
                  className="w-1/2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
                >
                  {checkingPhpVersion || loadingSubVersions || loadingNpmVersions ? t('sourceLoading') : t('sourceContinue')}
                </button>
              </div>
            </div>
          )}
          
          {/* Step 2: Configuration */}
          {step === 'config' && selectedSource && (
            <div className="space-y-6">
              {/* Selected Source */}
              <div className="flex items-center gap-4 p-4 bg-navy-700 rounded-lg">
                <div className="w-10 h-10 flex items-center justify-center">
                  {getFrameworkIcon(selectedSource.id, 32)}
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {selectedFrameworkVersion 
                      ? `${selectedSource.name} ${selectedFrameworkVersion.label}`
                      : selectedSource.name
                    }
                  </h3>
                  <p className="text-sm text-gray-400">{t(selectedSource.descriptionKey as any)}</p>
                </div>
                <button onClick={() => {
                  if (selectedSource.hasVersions) {
                    setStep('version');
                  } else {
                    setStep('select');
                  }
                }} className="ml-auto text-gray-400 hover:text-white">
                  {t('sourceChange')}
                </button>
              </div>
              
              {/* Installation Location */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">{t('sourceInstallLocation')}</label>
                <div className="flex gap-3">
                  <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition ${
                    installInPlace 
                      ? 'border-teal-500 bg-teal-500/10' 
                      : 'border-navy-600 bg-navy-700 hover:border-navy-500'
                  }`}>
                    <input
                      type="radio"
                      checked={installInPlace}
                      onChange={() => setInstallInPlace(true)}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📍</span>
                      <div>
                        <p className="font-medium text-white">{t('sourceInstallHere')}</p>
                        <p className="text-xs text-gray-400">{t('sourceInstallHereDesc')} {targetPath}</p>
                      </div>
                    </div>
                  </label>
                  
                  <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition ${
                    !installInPlace 
                      ? 'border-teal-500 bg-teal-500/10' 
                      : 'border-navy-600 bg-navy-700 hover:border-navy-500'
                  }`}>
                    <input
                      type="radio"
                      checked={!installInPlace}
                      onChange={() => setInstallInPlace(false)}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📁</span>
                      <div>
                        <p className="font-medium text-white">{t('sourceCreateSubfolder')}</p>
                        <p className="text-xs text-gray-400">{t('sourceCreateSubfolderDesc')}</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Project Name (only if not installing in place) */}
              {!installInPlace && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t('sourceProjectName')}</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    className="w-full px-4 py-2 bg-navy-900 text-white rounded-lg border border-navy-600 focus:border-teal-500 focus:outline-none"
                    placeholder="my-project"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('sourceWillBeCreatedAt')} {targetPath}/{projectName}
                  </p>
                </div>
              )}
              
              {/* Database Configuration */}
              {selectedSource.requiresDb && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dbEnabled}
                        onChange={(e) => setDbEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-navy-600 bg-navy-900 text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-white font-medium">{t('sourceConfigureDb')}</span>
                    </label>
                  </div>
                  
                  {dbEnabled && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-navy-700/50 rounded-lg">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">{t('sourceDbType')}</label>
                        <select
                          value={dbCredentials.type}
                          onChange={(e) => setDbCredentials({ ...dbCredentials, type: e.target.value as any })}
                          className="w-full px-3 py-2 bg-navy-900 text-white rounded border border-navy-600 focus:border-teal-500 focus:outline-none"
                        >
                          <option value="mysql">MySQL</option>
                          <option value="pgsql">PostgreSQL</option>
                          <option value="sqlite">SQLite</option>
                          <option value="sqlsrv">SQL Server</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">{t('sourceDbHost')}</label>
                        <input type="text" value={dbCredentials.host}
                          onChange={(e) => setDbCredentials({ ...dbCredentials, host: e.target.value })}
                          className="w-full px-3 py-2 bg-navy-900 text-white rounded border border-navy-600 focus:border-teal-500 focus:outline-none"
                          placeholder="localhost"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">{t('sourceDbPort')}</label>
                        <input type="text" value={dbCredentials.port}
                          onChange={(e) => setDbCredentials({ ...dbCredentials, port: e.target.value })}
                          className="w-full px-3 py-2 bg-navy-900 text-white rounded border border-navy-600 focus:border-teal-500 focus:outline-none"
                          placeholder="3306"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">{t('sourceDbName')}</label>
                        <input type="text" value={dbCredentials.database}
                          onChange={(e) => setDbCredentials({ ...dbCredentials, database: e.target.value })}
                          className="w-full px-3 py-2 bg-navy-900 text-white rounded border border-navy-600 focus:border-teal-500 focus:outline-none"
                          placeholder="my_database"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">{t('sourceDbUsername')}</label>
                        <input type="text" value={dbCredentials.username}
                          onChange={(e) => setDbCredentials({ ...dbCredentials, username: e.target.value })}
                          className="w-full px-3 py-2 bg-navy-900 text-white rounded border border-navy-600 focus:border-teal-500 focus:outline-none"
                          placeholder="root"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">{t('sourceDbPassword')}</label>
                        <input type="password" value={dbCredentials.password}
                          onChange={(e) => setDbCredentials({ ...dbCredentials, password: e.target.value })}
                          className="w-full px-3 py-2 bg-navy-900 text-white rounded border border-navy-600 focus:border-teal-500 focus:outline-none"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Step 3: Dependencies Check */}
          {step === 'deps' && selectedSource && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">{t('sourceDepsCheck')}</h3>
                <p className="text-gray-400">{t('sourceDepsCheckDesc')}</p>
              </div>
              
              {/* Dependency Status Cards */}
              <div className="space-y-4">
                {/* Composer (for PHP) */}
                {selectedSource.requiresComposer && (
                  <div className={`p-4 rounded-lg border ${
                    deps.composer === null ? 'border-navy-600 bg-navy-700' :
                    deps.composer ? 'border-green-500/50 bg-green-500/10' : 'border-orange-500/50 bg-orange-500/10'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎵</span>
                        <div>
                          <p className="font-medium text-white">Composer</p>
                          <p className="text-sm text-gray-400">
                            {deps.composer === null ? t('sourceChecking') :
                             deps.composer ? `${t('sourceInstalled')} (v${deps.composerVersion})` : t('sourceNotInstalled')}
                          </p>
                        </div>
                      </div>
                      {deps.composer === false && (
                        <button
                          onClick={installComposer}
                          disabled={isInstalling}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-navy-600 text-white rounded-lg transition"
                        >
                          {isInstalling ? t('sourceInstalling') : t('sourceInstallComposer')}
                        </button>
                      )}
                      {deps.composer === true && (
                        <span className="text-green-400">✓ {t('sourceReady')}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Node.js (for JS/TS) */}
                {selectedSource.requiresNode && (
                  <div className={`p-4 rounded-lg border ${
                    deps.node === null ? 'border-navy-600 bg-navy-700' :
                    deps.node ? 'border-green-500/50 bg-green-500/10' : 'border-orange-500/50 bg-orange-500/10'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">⬢</span>
                        <div>
                          <p className="font-medium text-white">Node.js</p>
                          <p className="text-sm text-gray-400">
                            {deps.node === null ? t('sourceChecking') :
                             deps.node ? `${t('sourceInstalled')} (${deps.nodeVersion})` : t('sourceNotInstalled')}
                          </p>
                        </div>
                      </div>
                      {deps.node === true && (
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓ {t('sourceReady')}</span>
                          <button
                            onClick={async () => {
                              const confirmed = window.confirm(
                                `Uninstall Node.js ${deps.nodeVersion}? You can then install a different version.`
                              );
                              if (!confirmed) return;
                              
                              setIsInstalling(true);
                              addLog('info', `🗑️ Uninstalling Node.js ${deps.nodeVersion}...`);
                              
                              // Get just the version number (e.g., "20.11.0" from "v20.11.0")
                              const version = deps.nodeVersion.replace('v', '');
                              const uninstallCmd = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm deactivate && nvm uninstall ${version} 2>&1`;
                              addLog('command', `$ nvm uninstall ${version}`);
                              
                              try {
                                const result = await ipcRenderer.invoke('ssh:execute', connectionId, uninstallCmd);
                                if (result.success) {
                                  addLog('success', `✓ Node.js ${deps.nodeVersion} uninstalled`);
                                  // Re-check dependencies
                                  await checkDependencies();
                                  // Fetch versions for selection
                                  await fetchNodeVersions();
                                } else {
                                  addLog('error', `✗ Failed to uninstall: ${result.error}`);
                                }
                              } catch (error: any) {
                                addLog('error', `✗ Error: ${error.message}`);
                              }
                              setIsInstalling(false);
                            }}
                            disabled={isInstalling}
                            className="text-xs px-2 py-1 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded transition"
                            title="Uninstall to install a different version"
                          >
                            Uninstall
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Node version selector */}
                    {deps.node === false && (
                      <div className="mt-3 pt-3 border-t border-navy-600">
                        <label className="block text-sm text-gray-400 mb-2">Select Node.js Version:</label>
                        
                        {loadingNodeVersions ? (
                          <div className="flex items-center gap-2 text-gray-400 py-4">
                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
                            </svg>
                            <span>Fetching available Node.js versions...</span>
                          </div>
                        ) : (
                          <div className="max-h-[250px] overflow-y-auto space-y-2 mb-3">
                            {availableNodeVersions.map(v => (
                              <div key={v.major} className="border border-navy-600 rounded-lg overflow-hidden">
                                {/* Major version header */}
                                <div
                                  className={`flex items-center justify-between p-3 cursor-pointer transition ${
                                    selectedNodeVersion.startsWith(v.version.split('.')[0] + '.')
                                      ? 'bg-teal-500/10 border-teal-500'
                                      : 'bg-navy-800 hover:bg-navy-700'
                                  }`}
                                  onClick={() => setExpandedMajor(expandedMajor === v.major ? null : v.major)}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">Node.js {v.major}</span>
                                    {v.lts && (
                                      <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                                        LTS {typeof v.lts === 'string' ? `(${v.lts})` : ''}
                                      </span>
                                    )}
                                    {selectedNodeVersion.startsWith(v.major + '.') && (
                                      <span className="text-xs text-teal-400">• v{selectedNodeVersion}</span>
                                    )}
                                  </div>
                                  <svg
                                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedMajor === v.major ? 'rotate-180' : ''}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                                
                                {/* Sub-versions (expandable) */}
                                {expandedMajor === v.major && (
                                  <div className="p-2 bg-navy-900 grid grid-cols-2 gap-1">
                                    {v.subVersions.map(subV => (
                                      <label
                                        key={subV}
                                        className={`p-2 rounded cursor-pointer transition text-sm ${
                                          selectedNodeVersion === subV
                                            ? 'bg-teal-500/20 text-teal-400'
                                            : 'hover:bg-navy-700 text-gray-300'
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name="nodeVersion"
                                          value={subV}
                                          checked={selectedNodeVersion === subV}
                                          onChange={(e) => setSelectedNodeVersion(e.target.value)}
                                          className="sr-only"
                                        />
                                        v{subV}
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <button
                          onClick={installNodeViaOrWithNvm}
                          disabled={isInstalling || loadingNodeVersions || !selectedNodeVersion}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-navy-600 text-white rounded-lg transition"
                        >
                          {isInstalling ? 'Installing...' : `Install Node.js v${selectedNodeVersion} via NVM`}
                        </button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          This will install NVM (Node Version Manager) if not present
                        </p>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        )}
          {(step === 'installing' || step === 'complete') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {step === 'complete' ? 'Installation Complete' : 'Installing...'}
                  </span>
                  <span className="text-teal-400">{progress}%</span>
                </div>
                <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      step === 'complete' ? 'bg-green-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {currentCommand && (
                  <p className="text-xs text-gray-500 truncate font-mono">{currentCommand}</p>
                )}
              </div>
              
              {/* Installation Logs - xterm.js viewer */}
              <XTermLogViewer ref={xtermLogRef} height="300px" />
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-navy-600 bg-navy-800/50">
          <div className="text-sm text-gray-400">
            {step === 'select' && t('sourceSelectFrameworkHint')}
            {step === 'version' && t('sourceSelectVersionHint')}
            {step === 'config' && t('sourceConfigureHint')}
            {step === 'deps' && (canProceed() ? `✅ ${t('sourceAllDepsReady')}` : `⚠️ ${t('sourceInstallDepsFirst')}`)}
            {step === 'installing' && t('sourceWaitSetup')}
            {step === 'complete' && `✅ ${t('sourceProjectReady')}`}
          </div>
          
          <div className="flex gap-3">
            {step === 'config' && (
              <>
                <button onClick={() => {
                  if (selectedSource?.hasVersions) {
                    setStep('version');
                  } else {
                    setStep('select');
                  }
                }} className="px-4 py-2 text-gray-400 hover:text-white transition">
                  {t('sourceBack')}
                </button>
                <button
                  onClick={handleContinueToInstall}
                  disabled={continueLoading || (!installInPlace && !projectName.trim())}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-navy-600 disabled:text-gray-500 text-white rounded-lg transition flex items-center gap-2"
                >
                  {continueLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
                      </svg>
                      {t('sourceChecking')}
                    </>
                  ) : (
                    <>
                      {t('sourceContinue')}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </>
            )}
            
            {step === 'deps' && (
              <>
                <button onClick={() => setStep('config')} className="px-4 py-2 text-gray-400 hover:text-white transition">
                  {t('sourceBack')}
                </button>
                <button
                  onClick={() => checkDependencies()}
                  disabled={checkingDeps}
                  className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg transition"
                >
                  {checkingDeps ? t('sourceChecking') : t('sourceRecheck')}
                </button>
                <button
                  onClick={startInstallation}
                  disabled={!canProceed() || isInstalling}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-navy-600 disabled:text-gray-500 text-white rounded-lg transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t('sourceStartInstall')}
                </button>
              </>
            )}
            
            {step === 'complete' && (
              <button
                onClick={() => {
                  onInstallComplete?.();
                  onClose();
                }}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition"
              >
                {t('sourceDone')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceInstaller;

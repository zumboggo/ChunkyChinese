import {defineConfig,devices} from '@playwright/test'
import {resolve} from 'node:path'
const baseURL=process.env.PLAYWRIGHT_BASE_URL,output=process.env.EPISODE_TEST_OUTPUT
if(!baseURL||!output||!process.env.EPISODE_FIXTURE)throw Error('Run npm run game:episode:test -- --fixture=PATH')
export default defineConfig({
 testDir:'./tests',testMatch:'episode-authoring.spec.ts',fullyParallel:true,workers:2,timeout:90000,retries:0,
 outputDir:resolve(output,'test-results'),reporter:[['line'],['json',{outputFile:resolve(output,'browser-results.json')}]],
 use:{baseURL,trace:'retain-on-failure'},
 projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'phone',use:{...devices['Pixel 5']}}],
 webServer:{command:`npm run dev -- --host 127.0.0.1 --port ${new URL(baseURL).port} --strictPort`,url:baseURL,reuseExistingServer:false},
})

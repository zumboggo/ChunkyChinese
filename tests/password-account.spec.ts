import { test, expect } from '@playwright/test'

test('email login reports invalid credentials without opening study data', async ({ page }) => {
  await page.route('**/auth/v1/token**', route => route.fulfill({status:400, contentType:'application/json',body:JSON.stringify({code:'invalid_credentials',msg:'Invalid login credentials'})}))
  await page.goto('/?account=1')
  await page.getByLabel('Email', {exact:true}).fill('learner@example.com')
  await page.getByLabel('Password', {exact:true}).fill('wrong-password')
  await page.getByRole('button',{name:'Sign in',exact:true}).click()
  await expect(page.getByRole('status')).toContainText('Invalid login credentials')
  await expect(page.getByRole('heading',{name:'Sign in with email'})).toBeVisible()
})

test('invitation opens password setup and validates confirmation', async ({page}) => {
  const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'learner@example.com',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()}
  const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),aud:'authenticated',role:'authenticated'})).toString('base64url')}.test-signature`
  let writes=0
  await page.route('**/auth/v1/user',async route=>{
    if(route.request().method()==='PUT') { writes++; expect(route.request().postDataJSON()).toMatchObject({password:'a-long-test-password'}) }
    await route.fulfill({contentType:'application/json',body:JSON.stringify(user)})
  })
  await page.goto(`/#access_token=${jwt}&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=invite`)
  await expect(page.getByRole('heading',{name:'Choose your password'})).toBeVisible()
  await page.getByLabel('New password (at least 12 characters)').fill('a-long-test-password')
  await page.getByLabel('Confirm password').fill('different-password')
  await page.getByRole('button',{name:'Save password'}).click()
  await expect(page.getByRole('status')).toContainText('do not match')
  expect(writes).toBe(0)
  await page.getByLabel('Confirm password').fill('a-long-test-password')
  await page.getByRole('button',{name:'Save password'}).click()
  await expect(page.getByRole('status')).toContainText('Your password is saved')
  expect(writes).toBe(1)
})

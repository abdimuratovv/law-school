"""Rendered target/reflow matrix and screenshot-composited contrast measurements.
No user browser profile is opened. See README for scope/measurement limitations.
"""
import io,json,re,statistics
from itertools import product
from pathlib import Path
from PIL import Image,ImageColor
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
SHOTS=OUT/'screenshots';SHOTS.mkdir(exist_ok=True)
BASE='http://127.0.0.1:5173'

def luminance(rgb):
 v=[c/255 for c in rgb];v=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in v]
 return sum(c*w for c,w in zip(v,[.2126,.7152,.0722]))
def contrast(a,b):
 a,b=sorted([luminance(a),luminance(b)]);return (b+.05)/(a+.05)
def rgb(value):
 if value.startswith('#'):return ImageColor.getrgb(value)
 return tuple(float(x) for x in re.findall(r'[\d.]+',value)[:3])

METRICS="""() => {
 const controls=[...document.querySelectorAll('main button,main a,main input,main select,main textarea')].filter(e=>!e.closest('[hidden]')&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.classList.contains('ds-skip'));
 return {overflow:document.documentElement.scrollWidth>innerWidth,
 smallTargets:controls.map(e=>({tag:e.tagName,name:(e.getAttribute('aria-label')||e.textContent||e.id).slice(0,100),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})).filter(r=>r.width<43.9||r.height<43.9),
 controlCount:controls.length,
 examActionHeights:[...document.querySelectorAll('.ds-exam-actions .btn')].map(e=>e.getBoundingClientRect().height),
 glassBackdrop:getComputedStyle(document.querySelector('.ds-controls')).backdropFilter,
 theme:document.documentElement.className,
 language:document.documentElement.lang};
}"""

def pixel_probe(page,selector,name,threshold=4.5):
 page.evaluate("Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))")
 el=page.locator(selector).first;el.scroll_into_view_if_needed();page.mouse.move(0,0)
 styles=el.evaluate("""e=>{let s=getComputedStyle(e);return {color:s.color,filter:s.filter,style:e.getAttribute('style')}}""")
 el.evaluate("e=>{e.style.color='transparent';e.style.textShadow='none'}")
 im=Image.open(io.BytesIO(el.screenshot(animations='disabled'))).convert('RGB')
 positions=[(int(im.width*x),int(im.height*y)) for x,y in product([.3,.5,.7],[.3,.5,.7])]
 background=tuple(statistics.median(im.getpixel(pos)[i] for pos in positions) for i in range(3))
 el.evaluate("(e,s)=>s===null?e.removeAttribute('style'):e.setAttribute('style',s)",styles['style'])
 foreground=rgb(styles['color']);brightness=re.search(r'brightness\(([\d.]+)\)',styles['filter'])
 if brightness:foreground=tuple(min(255,c*float(brightness[1])) for c in foreground)
 ratio=contrast(foreground,background)
 return {'name':name,'selector':selector,'foreground':foreground,'sampledBackground':background,'ratio':round(ratio,2),'threshold':threshold,'passed':ratio>=threshold}

def main():
 records=[];contrasts=[];media=[]
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chrome',headless=True)
  for (width,height),theme,lang,opaque in product([(1440,900),(1366,768),(1024,768)],['light','dark'],['uz','kaa','ru'],[False,True]):
   ctx=browser.new_context(viewport={'width':width,'height':height},color_scheme=theme)
   ctx.add_init_script('localStorage.setItem("hm.theme",'+json.dumps(json.dumps(theme))+');localStorage.setItem("hm.language",'+json.dumps(lang)+');localStorage.setItem("hm.rt",'+json.dumps(json.dumps(opaque))+');')
   page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(BASE+'/design');page.wait_for_load_state('networkidle');page.evaluate('document.fonts.ready')
   for density in ['comfortable','compact']:
    page.locator('[role="radiogroup"]').nth(1).locator('button').nth(0 if density=='comfortable' else 1).click()
    record={'viewport':[width,height],'theme':theme,'language':lang,'opaque':opaque,'density':density,'errors':list(errors),**page.evaluate(METRICS)}
    if density=='comfortable' and not opaque:
     name=f'reference-{width}-{theme}-{lang}.png';page.screenshot(path=str(SHOTS/name),full_page=True);record['screenshot']='screenshots/'+name
    if width==1366 and lang=='ru' and density=='comfortable':
     for subject in ['student','teacher']:
      name=f'{subject}-{theme}-'+('opaque' if opaque else 'glass')+'.png';page.locator(f'[data-testid="{subject}-preview"]').screenshot(path=str(SHOTS/name))
    records.append(record)
   if width==1366 and lang=='ru':
    page.locator('[role="radiogroup"]').nth(1).locator('button').first.click()
    condition={'theme':theme,'opaque':opaque}
    for selector,name in [('.ds-hero .body','body'),('.ds-token code','quiet code'),('.ds-controls .flab','glass label'),('.ds-controls [role="radio"][aria-checked="true"]','selected radio'),('.notice-success strong','success text'),('.notice-warning strong','warning text'),('.notice-error strong','error text')]:
     contrasts.append({**condition,**pixel_probe(page,selector,name)})
    for state in ['Default','Hover','Pressed','Focus','Selected','Error','Success']:
     page.locator('#example-state').select_option(state)
     result={**condition,'state':state,**pixel_probe(page,'#state-button','primary button')};contrasts.append(result)
     page.locator('#state-button').screenshot(path=str(SHOTS/f'button-{theme}-{opaque}-{state}.png'))
    tokens=page.evaluate("""()=>{let s=getComputedStyle(document.documentElement);return Object.fromEntries(['--control-border','--surface','--surface-2','--focus','--bg'].map(k=>[k,s.getPropertyValue(k).trim()]))}""")
    for a,b in [('--control-border','--surface'),('--control-border','--surface-2'),('--focus','--surface'),('--focus','--bg')]:
     ratio=contrast(rgb(tokens[a]),rgb(tokens[b]));contrasts.append({**condition,'name':a+' against '+b,'ratio':round(ratio,2),'threshold':3,'passed':ratio>=3,'method':'opaque resolved token pair; composed text measured separately'})
   ctx.close()
   (OUT/'reference-matrix.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
   print(width,theme,lang,opaque,len(records),flush=True)
  # Narrow effective widths, enlarged text and media are targeted component checks.
  ctx=browser.new_context(viewport={'width':1024,'height':768});page=ctx.new_page();page.goto(BASE+'/design');page.wait_for_load_state('networkidle')
  for width in [320,375]:
   page.set_viewport_size({'width':width,'height':768});media.append({'name':'Reflow '+str(width),**page.evaluate(METRICS)})
   page.screenshot(path=str(SHOTS/f'reflow-{width}.png'),full_page=True)
  page.set_viewport_size({'width':1024,'height':768});page.evaluate("document.documentElement.style.fontSize='200%'")
  media.append({'name':'200% root text',**page.evaluate(METRICS)});page.screenshot(path=str(SHOTS/'text-200.png'),full_page=True)
  page.evaluate("document.documentElement.style.fontSize=''");page.emulate_media(reduced_motion='reduce')
  page.locator('#example-state').select_option('Loading');media.append({'name':'Reduced motion','spinnerAnimation':page.locator('.spinner').first.evaluate('(e)=>getComputedStyle(e).animationName')})
  page.emulate_media(forced_colors='active');media.append({'name':'Forced colors','active':page.evaluate('matchMedia("(forced-colors: active)").matches'),'bodyText':page.locator('h1').evaluate('(e)=>getComputedStyle(e).color')});page.screenshot(path=str(SHOTS/'forced-colors.png'),full_page=True)
  ctx.close();browser.close()
 (OUT/'contrast-measurements.json').write_text(json.dumps(contrasts,ensure_ascii=False,indent=2),encoding='utf-8')
 (OUT/'media-checks.json').write_text(json.dumps(media,ensure_ascii=False,indent=2),encoding='utf-8')
 failures=[r for r in records if r['overflow'] or r['smallTargets'] or r['errors'] or any(h<48 for h in r['examActionHeights'])]
 print('Matrix failures',len(failures),'contrast failures',len([r for r in contrasts if not r['passed']]),flush=True)
 assert not failures and all(r['passed'] for r in contrasts), 'Reference matrix or measured contrast failure'
 assert not any(r.get('overflow') or r.get('smallTargets') for r in media), 'Media/reflow failure'

if __name__=="__main__":main()

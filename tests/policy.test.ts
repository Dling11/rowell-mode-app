import test from "node:test";
import assert from "node:assert/strict";
import { applyEmergencyMode,defaultSettings,downloadsAllowed,settingsSchema } from "../src/features/site-settings/model/policy";
import { releasePointerSchema,validatePublishedAsset,shouldCountRequest,type ReleasePointer } from "../src/features/downloads/model/release-schema";
import { projects } from "../src/data/projects";

test("download policy fails closed and emergency overrides cannot reopen it",()=>{
  const policy={...defaultSettings,available:true,configured:true};
  assert.equal(downloadsAllowed(policy,"mh-tri"),true);
  assert.equal(downloadsAllowed({...policy,available:false},"mh-tri"),false);
  for(const mode of ["maintenance","downloads-paused"] as const) assert.equal(downloadsAllowed({...policy,mode},"mh-tri"),false);
  assert.equal(downloadsAllowed({...policy,pausedProjects:["mh-tri"]},"mh-tri"),false);
  assert.equal(downloadsAllowed({...policy,pausedProjects:["mh-tri"]},"share-mode"),true);
  assert.equal(applyEmergencyMode({...defaultSettings,mode:"maintenance"},"normal").mode,"maintenance");
  assert.equal(applyEmergencyMode(defaultSettings,"typo").mode,"maintenance");
  assert.equal(applyEmergencyMode(defaultSettings,"downloads-paused").mode,"downloads-paused");
  assert.equal(settingsSchema.safeParse({...defaultSettings,secret:"bad"}).success,false);
});

const pointer:ReleasePointer={projectId:"mh-tri",platform:"android",tag:"rowell-1.4.13",asset:"MH3_Rowell_Dev-arm64.apk"};
const url="https://github.com/Dling11/monster_hunter_tri_emulator/releases/download/rowell-1.4.13/MH3_Rowell_Dev-arm64.apk";
const release={tag_name:pointer.tag,draft:false,prerelease:true,published_at:"2026-10-28T16:35:04Z",assets:[{name:pointer.asset,size:20726772,browser_download_url:url,state:"uploaded"}]};
test("only an exact published asset in the approved repository resolves, including prereleases",()=>{
  assert.equal(validatePublishedAsset(release,pointer).url,url);
  assert.throws(()=>validatePublishedAsset({...release,draft:true},pointer));
  assert.throws(()=>validatePublishedAsset({...release,published_at:null},pointer));
  assert.throws(()=>validatePublishedAsset({...release,tag_name:"nightly"},pointer));
  assert.throws(()=>validatePublishedAsset({...release,assets:[]},pointer));
  for(const badUrl of ["https://example.com/a.apk",url+"?redirect=evil",url.replace("Dling11/","other/"),url.replace("github.com","github.com.evil.test"),url.replace("https:","http:")]) {
    assert.throws(()=>validatePublishedAsset({...release,assets:[{...release.assets[0],browser_download_url:badUrl}]},pointer));
  }
});
test("unpublished projects and mismatched platform packages cannot be approved",()=>{
  assert.equal(releasePointerSchema.safeParse({...pointer,projectId:"mh4u"}).success,false);
  assert.equal(releasePointerSchema.safeParse({...pointer,platform:"windows"}).success,false);
  assert.equal(releasePointerSchema.safeParse({...pointer,tag:"../../latest"}).success,false);
  assert.equal(projects.find(p=>p.id==="mh4u")?.release,null);
  assert.equal(projects.find(p=>p.id==="share-mode")?.version,"1.0.4");
});
test("click accounting excludes HEAD, prefetch and obvious automation",()=>{
  const request=(headers:Record<string,string>={},method="GET")=>new Request("https://hub.example/download/mh-tri/android",{method,headers:{"user-agent":"Mozilla/5.0",...headers}});
  assert.equal(shouldCountRequest(request()),true);
  assert.equal(shouldCountRequest(request({},"HEAD")),false);
  const excludedHeaders:Record<string,string>[]=[{purpose:"prefetch"},{"sec-purpose":"prefetch;prerender"},{"next-router-prefetch":"1"},{"user-agent":"Googlebot"},{"user-agent":"HeadlessChrome"}];
  for(const headers of excludedHeaders) assert.equal(shouldCountRequest(request(headers)),false);
});

test("Low Spec is a separate Android-only approval with its own tag, asset and pause",()=>{
  const low:ReleasePointer={projectId:"mh-tri-low-spec",platform:"android",tag:"low-spec-0.1.2",asset:"MH3-Low-Spec-0.1-armeabi-v7a.apk"};
  assert.equal(releasePointerSchema.safeParse(low).success,true);
  for(const patch of [{platform:"windows"},{tag:pointer.tag},{asset:pointer.asset}]) {
    assert.equal(releasePointerSchema.safeParse({...low,...patch}).success,false);
  }
  const lowUrl=`https://github.com/Dling11/monster_hunter_tri_emulator/releases/download/${low.tag}/${low.asset}`;
  assert.equal(validatePublishedAsset({...release,tag_name:low.tag,assets:[{...release.assets[0],name:low.asset,browser_download_url:lowUrl}]},low).url,lowUrl);
  assert.equal(validatePublishedAsset(release,pointer).url,url);
  const parsed=settingsSchema.parse({...defaultSettings,pausedProjects:["mh-tri-low-spec"]});
  assert.equal(downloadsAllowed({...parsed,available:true,configured:true},low.projectId),false);
  assert.equal(downloadsAllowed({...parsed,available:true,configured:true},pointer.projectId),true);
  assert.equal(projects.find(p=>p.id===low.projectId)?.release,null);
});

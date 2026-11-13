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
test("unknown projects and mismatched platform packages cannot be approved",()=>{
  assert.equal(releasePointerSchema.safeParse({...pointer,projectId:"unknown"}).success,false);
  assert.equal(releasePointerSchema.safeParse({...pointer,platform:"windows"}).success,false);
  assert.equal(releasePointerSchema.safeParse({...pointer,tag:"../../latest"}).success,false);
  assert.equal(projects.find(p=>p.id==="mh4u")?.version,"1.0.17");
  assert.equal(projects.find(p=>p.id==="share-mode")?.version,"1.2.15");
});
test("MH4U editions resolve only their own Android release repositories",()=>{
  for (const [projectId,repo] of [["mh4u","Dling11/MH4-ULTIMATE"],["mh4u-native","khorne-hub/4u-native"]] as const) {
    const p = releasePointerSchema.parse({ projectId, platform: "android", tag: "v1", asset: "app.apk" });
    const asset = {...release.assets[0], name: "app.apk", browser_download_url: `https://github.com/${repo}/releases/download/v1/app.apk`};
    assert.equal(validatePublishedAsset({...release,tag_name:"v1",assets:[asset]},p).url,asset.browser_download_url);
    assert.throws(()=>validatePublishedAsset({...release,tag_name:"v1",assets:[{...asset,browser_download_url: asset.browser_download_url.replace(repo,"wrong/project")} ]},p));
    assert.equal(releasePointerSchema.safeParse({...p,platform:"windows",asset:"app.zip"}).success,false);
  }
});
test("click accounting excludes HEAD, prefetch and obvious automation",()=>{
  const request=(headers:Record<string,string>={},method="GET")=>new Request("https://hub.example/download/mh-tri/android",{method,headers:{"user-agent":"Mozilla/5.0",...headers}});
  assert.equal(shouldCountRequest(request()),true);
  assert.equal(shouldCountRequest(request({},"HEAD")),false);
  const excludedHeaders:Record<string,string>[]=[{purpose:"prefetch"},{"sec-purpose":"prefetch;prerender"},{"next-router-prefetch":"1"},{"user-agent":"Googlebot"},{"user-agent":"HeadlessChrome"}];
  for(const headers of excludedHeaders) assert.equal(shouldCountRequest(request(headers)),false);
});

test("MDM accepts only the original upstream Windows ZIP and honors pauses",()=>{
  const mdm = releasePointerSchema.parse({projectId:"mdm",platform:"windows",tag:"v0.5.2",asset:"MisterDownloadManager-0.5.2-portable.zip"});
  assert.equal(releasePointerSchema.safeParse({...mdm,platform:"android",asset:"MDM.apk"}).success,false);
  const assetUrl = `https://github.com/anefzaoui/misterdownloadmanager/releases/download/${mdm.tag}/${mdm.asset}`;
  const payload = {...release,tag_name:mdm.tag,assets:[{...release.assets[0],name:mdm.asset,browser_download_url:assetUrl}]};
  assert.equal(validatePublishedAsset(payload,mdm).url,assetUrl);
  assert.throws(()=>validatePublishedAsset({...payload,assets:[{...payload.assets[0],browser_download_url:assetUrl.replace("anefzaoui/misterdownloadmanager","Dling11/IDM_SOURCE_MODDED")}]},mdm));
  const settings = settingsSchema.parse({...defaultSettings,pausedProjects:["mdm"]});
  assert.equal(downloadsAllowed({...settings,available:true,configured:true},"mdm"),false);
  assert.equal(downloadsAllowed({...settings,available:true,configured:true},"mh-tri"),true);
  const project = projects.find(p => p.id === "mdm")!;
  assert.deepEqual(project.platforms,["windows"]);
  assert.match(project.attribution,/Ahmed Nefzaoui/);
  assert.ok(!JSON.stringify(project).includes("IDM_SOURCE_MODDED"));
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

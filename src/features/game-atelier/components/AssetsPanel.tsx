import { GameAssetTree } from './GameAssetTree';

export function AssetsPanel(): React.JSX.Element {
  return (
    <section aria-labelledby="assets-panel-title" className="border border-cabinet-border bg-cabinet-surface/30">
      <header className="border-b border-cabinet-border bg-cabinet-elevated px-4 py-4 sm:px-5">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-cabinet-brass">Virtual Unity Draft</p>
        <h3 className="mt-1 font-serif text-2xl text-cabinet-text" id="assets-panel-title">Assets</h3>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-cabinet-muted">
          Unity 프로젝트에서 사용할 권장 폴더 구성을 미리 보여주는 가상 목록입니다. 실제 파일 시스템이나 Unity 프로젝트에는 쓰지 않습니다.
        </p>
      </header>
      <div className="grid min-w-0 md:grid-cols-[260px_minmax(0,1fr)]">
        <div className="border-b border-cabinet-border p-5 md:border-b-0 md:border-r">
          <GameAssetTree />
        </div>
        <dl className="grid min-w-0 sm:grid-cols-2">
          <div className="border-b border-cabinet-border p-4 sm:border-r">
            <dt className="font-mono text-xs text-cabinet-brass">Scenes/MainScene.unity</dt>
            <dd className="mt-2 text-xs leading-5 text-cabinet-muted">Scene(게임 한 화면의 객체 배치를 저장하는 Unity 파일) 초안 위치입니다.</dd>
          </div>
          <div className="border-b border-cabinet-border p-4">
            <dt className="font-mono text-xs text-cabinet-brass">Scripts/*.cs</dt>
            <dd className="mt-2 text-xs leading-5 text-cabinet-muted">플레이어 이동, 진행 관리, 아이템 수집 동작을 나눈 C# 초안입니다.</dd>
          </div>
          <div className="p-4 sm:col-span-2">
            <dt className="font-mono text-xs text-cabinet-brass">Prefabs/</dt>
            <dd className="mt-2 text-xs leading-5 text-cabinet-muted">Prefab(여러 Scene에서 다시 쓸 객체 묶음)을 나중에 둘 빈 폴더입니다. 이번 단계에서는 파일을 생성하지 않습니다.</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

import { Composition } from 'remotion'
import { CardapioReel, reelDuration } from './CardapioReel'
import data from './cardapio.json'

export const FPS = 30

export function Root() {
  return (
    <Composition
      id="CardapioReel"
      component={CardapioReel}
      durationInFrames={reelDuration(data, FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ data }}
    />
  )
}

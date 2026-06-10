import type { AnimationManagerHandle } from './useAnimationManager'
import type { StagePosition, StoryAnimCommand } from './animationTypes'

export interface StoryCommandContext {
  manager: AnimationManagerHandle
}

export async function executeStoryAnimCommand(
  command: StoryAnimCommand,
  ctx: StoryCommandContext,
): Promise<void> {
  const { manager } = ctx

  switch (command.type) {
    case 'show': {
      if (!command.character) { warn(command, 'missing character'); return }
      await manager.showCharacter(command.character, {
        position: command.position as StagePosition | undefined,
        expression: command.expression,
        animation: command.animation,
        facing: command.facing,
      })
      break
    }

    case 'hide': {
      if (!command.character) { warn(command, 'missing character'); return }
      await manager.hideCharacter(command.character, {
        animation: command.animation,
        duration: command.duration,
      })
      break
    }

    case 'expression': {
      if (!command.character) { warn(command, 'missing character'); return }
      await manager.setExpression(command.character, command.value ?? command.expression ?? 'neutral', {
        crossfade: command.transition === 'crossfade',
      })
      break
    }

    case 'animate': {
      if (!command.character) { warn(command, 'missing character'); return }
      await manager.animateCharacter(command.character, command.animation ?? 'bounce', {
        duration: command.duration,
        to: command.position as StagePosition | undefined,
      })
      break
    }

    case 'move': {
      if (!command.character) { warn(command, 'missing character'); return }
      if (!command.position) { warn(command, 'missing position'); return }
      await manager.moveCharacter(command.character, command.position as StagePosition, {
        duration: command.duration,
      })
      break
    }

    case 'dialogue': {
      if (!command.speaker && !command.character) { warn(command, 'missing speaker'); return }
      const charId = command.speaker ?? command.character!
      if (command.expression) {
        await manager.setExpression(charId, command.expression, { crossfade: true })
      }
      if (command.animation) {
        await manager.animateCharacter(charId, command.animation, { duration: command.duration })
      }
      break
    }

    default:
      warn(command, `unknown command type: ${(command as { type: string }).type}`)
  }
}

export function isWaitCommand(command: StoryAnimCommand): boolean {
  return command.wait !== false
}

export async function executeStoryAnimCommands(
  commands: StoryAnimCommand[],
  ctx: StoryCommandContext,
): Promise<void> {
  const waitCommands = commands.filter((c) => isWaitCommand(c))
  const fireCommands = commands.filter((c) => !isWaitCommand(c))

  for (const cmd of fireCommands) {
    void executeStoryAnimCommand(cmd, ctx)
  }

  for (const cmd of waitCommands) {
    await executeStoryAnimCommand(cmd, ctx)
  }
}

function warn(command: StoryAnimCommand, message: string): void {
  console.warn(`[StoryAnimCommand] ${message}`, command)
}

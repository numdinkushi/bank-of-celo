import {
  RoundAdvanced as RoundAdvancedEvent,
  TicketPurchased as TicketPurchasedEvent,
  WinnerSelected as WinnerSelectedEvent,
  WinningsClaimed as WinningsClaimedEvent,
} from "../generated/CeloJackpot/CeloJackpot"
import {
  RoundAdvanced,
  TicketPurchased,
  WinnerSelected,
  WinningsClaimed,
} from "../generated/schema"

export function handleRoundAdvanced(event: RoundAdvancedEvent): void {
  let entity = new RoundAdvanced(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.newRoundId = event.params.newRoundId
  entity.carryOverPot = event.params.carryOverPot

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTicketPurchased(event: TicketPurchasedEvent): void {
  let entity = new TicketPurchased(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.buyer = event.params.buyer
  entity.roundId = event.params.roundId
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWinnerSelected(event: WinnerSelectedEvent): void {
  let entity = new WinnerSelected(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.roundId = event.params.roundId
  entity.winner = event.params.winner
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWinningsClaimed(event: WinningsClaimedEvent): void {
  let entity = new WinningsClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.roundId = event.params.roundId
  entity.winner = event.params.winner
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

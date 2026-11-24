# SnackStakes Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Profile Identity**: A `/profiles/{userId}` document can only be created or updated by the authenticated owner (`request.auth.uid == userId`), and `uid` must stay immutable. No PII (`email`, `phone`, `address`) is stored in `/profiles`.
2. **Friendship Ownership**: Only `userId` may initiate a `pending` friendship; only `friendId` may transition `pending -> accepted`; either participant may delete/decline.
3. **Message Authenticity**: A `/messages/{messageId}` document must have `senderId == request.auth.uid` and `createdAt == request.time`. Only `senderId`, `receiverId`, or members of `roomId` may read/list.
4. **Inventory Isolation**: A player can only read, create, update, or delete `/inventory/{itemId}` records where `userId == request.auth.uid`.
5. **Wager Dual-Consent & Terminal Locking**: Only `creatorId` or `opponentId` can read or update a `/wagers/{wagerId}` document. Updates use strict action branches (`updateCreatorOffer`, `updateOpponentOffer`, `activateWager`, `completeWager`, `cancelWager`). Once `status` reaches `completed` or `cancelled`, further updates are rejected.
6. **GameRoom Bounds & Membership**: `maxPlayers` is strictly `2 <= maxPlayers <= 8`. `players` and `playerIds` arrays are bounded to `size() <= 8`. Only authenticated users can read waiting rooms or rooms they participate in; terminal `finished` rooms are locked against further state changes.
7. **IOU Settlement Authority**: Only `winnerId` can mark an IOU as `settled: true`; once `settled == true`, the IOU is immutable.
8. **Match History Integrity**: Only `userId == request.auth.uid` can write/read their own match history entries, with immutable `createdAt == request.time`.

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Profile Spoofing**: Create `/profiles/victim_uid` while signed in as `attacker_uid` (`uid != request.auth.uid`).
2. **Shadow Field Injection on Profile**: Update `/profiles/{uid}` adding `isAdmin: true`.
3. **Oversized ID Poisoning**: Create `/profiles/a...` (150 chars) exceeding `isValidId` limit of 128 chars.
4. **Unverified Email Write**: Attempt write when `request.auth.token.email_verified == false`.
5. **Friendship Auto-Accept Bypass**: Creator inserts `/friendships/f1` with `status: "accepted"` immediately without recipient approval.
6. **Message Sender Forgery**: Insert `/messages/m1` with `senderId: "other_user"`.
7. **Client Timestamp Forgery**: Insert `/messages/m1` with backdated `createdAt` (`!= request.time`).
8. **Inventory Theft**: Read or update `/inventory/{itemId}` belonging to another `userId`.
9. **Wager Self-Approval Forgery**: `creatorId` attempts to update `opponentApproved: true` on `/wagers/{wagerId}`.
10. **Terminal Wager Re-open**: Update `/wagers/{wagerId}` when `existing().status == "completed"` back to `"active"`.
11. **Loser Self-Settling IOU**: `loserId` attempts to update `/ious/{iouId}` setting `settled: true`.
12. **Unbounded Room Array Poisoning**: Create `/game_rooms/{roomId}` with `maxPlayers: 50` or `players.size() > 8`.

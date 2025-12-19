const matchLoop = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, messages: nkruntime.MatchMessage[]) {

    for (const message of messages) {
        const { opCode, sender, data } = message;

        if (opCode === OpCode.MOVE_PIECE) {
            const move = JSON.parse(nk.binaryToString(data));

            // Guard: Ignore moves sent out of turn
            if (sender.sessionId !== state.currentPlayerId) {
                logger.warn(`Unauthorized move: ${sender.userId}`);
                continue; 
            }

            // Reject illegal movement (teleporting/clipping)
            if (!isValidMove(state.board, move.from, move.to)) {
                logger.debug("Move rejected: Logic violation");
                continue; 
            }

            // Commit move and relay to peers
            state.actionsLeft--;
            dispatcher.broadcastMessage(OpCode.MOVE_PIECE, data, null, sender);

            // Handle turn exhaustion
            if (state.actionsLeft <= 0) {
                const roll = getRandomIntRange(1, 6);
                state.actionsLeft = roll;
                state.currentPlayerId = (state.currentPlayerId === state.whitePlayerId) 
                    ? state.blackPlayerId : state.whitePlayerId;

                dispatcher.broadcastMessage(OpCode.TURN_START, JSON.stringify({ 
                    DiceResult: roll, 
                    IsWhite: state.currentPlayerId === state.whitePlayerId 
                }));
            }
        }
    }
    return { state };
};

// Validates Manhattan distance and target occupancy
function isValidMove(board: any, from: Vector2, to: Vector2): boolean {
    const dist = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    return dist === 1 && board[to.x][to.y] === null;
}
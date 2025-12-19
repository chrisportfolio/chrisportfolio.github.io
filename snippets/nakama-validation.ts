const matchLoop = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, messages: nkruntime.MatchMessage[]) {

    for (const message of messages) {
        const { opCode, sender, data } = message;

        if (opCode === OpCode.MOVE_PIECE) {
            let move;
            try {
                move = JSON.parse(nk.binaryToString(data));
            } catch (e) {
                logger.warn(`Parsing error: ${e}`);
                continue;
            }

            // Verify turn
            if (sender.sessionId !== state.currentPlayerId) {
                logger.warn(`Out of turn move: ${sender.userId}`);
                continue; 
            }

            if (!isValidMove(state.board, move.from, move.to)) {
                logger.warn(`Invalid move: ${sender.userId}`);
                continue; 
            }

            // Update board state
            const piece = state.board[move.from.x][move.from.y];
            state.board[move.to.x][move.to.y] = piece;
            state.board[move.from.x][move.from.y] = null;

            state.actionsLeft--;

            // Relay move to other players
            dispatcher.broadcastMessage(OpCode.MOVE_PIECE, data, null, sender);

            // Handle turn swap
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

function isValidMove(board: any[][], from: Vector2, to: Vector2): boolean {
    // Basic bounds check
    if (to.x < 0 || to.y < 0 || to.x >= board.length || to.y >= board[0].length) return false;
    if (from.x < 0 || from.y < 0 || from.x >= board.length || from.y >= board[0].length) return false;

    // Must move an existing piece to an empty square
    if (!board[from.x][from.y] || board[to.x][to.y] !== null) return false;

    // Manhattan distance check
    const dist = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    return dist === 1;
}
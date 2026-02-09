import kanbanServices from "../../services/kaban/kaban.services.js";
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

const ALLOWED_ROLES = ["admin", "hr", "leads"];

const validateAccess = (socket) => {
  if (!socket.user) {
    throw new Error("Unauthorized: No user found on socket");
  }
  if (!socket.companyId) {
    throw new Error("Unauthorized: companyId missing from socket");
  }
  if (!socket.userMetadata) {
    throw new Error("Unauthorized: metadata missing");
  }
  if (socket.userMetadata.companyId !== socket.companyId) {
    throw new Error("Unauthorized: company mismatch");
  }
  if (!ALLOWED_ROLES.includes(socket.role)) {
    throw new Error("Forbidden: role not allowed");
  }
  return socket.companyId;
};

const respondWithError = (socket, event, error) => {
  devError(`[Kanban] Error on ${event}:`, error);
  socket.emit(event, {
    done: false,
    error: error.message || "Something went wrong",
  });
};

const kanbanController = (socket, io) => {
  socket.on("kanban/board/get-data", async (payload = {}) => {
    const responseEvent = "kanban/board/get-data-response";
    try {
      const companyId = validateAccess(socket);
      const data = await kanbanServices.getKanbanBoardData(
        companyId,
        payload.filters || {}
      );
      socket.emit(responseEvent, { done: true, data });
    } catch (error) {
      respondWithError(socket, responseEvent, error);
    }
  });

  socket.on("kanban/card/update-stage", async (payload = {}) => {
    const responseEvent = "kanban/card/update-stage-response";
    try {
      const companyId = validateAccess(socket);
      const card = await kanbanServices.updateCardStage(
        companyId,
        {
          cardId: payload.cardId,
          destinationKey: payload.destinationKey,
          order: payload.order,
          reason: payload.reason,
        },
        {
          userId: socket.userId,
          role: socket.role,
        }
      );

      socket.emit(responseEvent, { done: true, data: card });
      socket
        .to(`company_${companyId}`)
        .emit("kanban/card/updated", { card, meta: { actor: socket.userId } });
    } catch (error) {
      respondWithError(socket, responseEvent, error);
    }
  });

  socket.on("kanban/card/bulk-update-stage", async (payload = {}) => {
    const responseEvent = "kanban/card/bulk-update-stage-response";
    try {
      const companyId = validateAccess(socket);
      const cards = await kanbanServices.bulkUpdateCardStage(
        companyId,
        {
          cardIds: payload.cardIds,
          destinationKey: payload.destinationKey,
          startingOrder: payload.startingOrder,
        },
        {
          userId: socket.userId,
          role: socket.role,
        }
      );

      socket.emit(responseEvent, { done: true, data: cards });
      socket
        .to(`company_${companyId}`)
        .emit("kanban/card/bulk-updated", {
          cards,
          meta: { actor: socket.userId },
        });
    } catch (error) {
      respondWithError(socket, responseEvent, error);
    }
  });

  socket.on("kanban/card/reorder", async (payload = {}) => {
    const responseEvent = "kanban/card/reorder-response";
    try {
      const companyId = validateAccess(socket);
      const result = await kanbanServices.reorderColumnCards(companyId, {
        columnKey: payload.columnKey,
        orderedCardIds: payload.orderedCardIds,
      });
      socket.emit(responseEvent, { done: true, data: result });
    } catch (error) {
      respondWithError(socket, responseEvent, error);
    }
  });

  socket.on("kanban/columns/save", async (payload = {}) => {
    const responseEvent = "kanban/columns/save-response";
    try {
      const companyId = validateAccess(socket);
      const columns = await kanbanServices.saveColumnConfiguration(
        companyId,
        { columns: payload.columns || [] }
      );
      socket.emit(responseEvent, { done: true, data: columns });
    } catch (error) {
      respondWithError(socket, responseEvent, error);
    }
  });

  socket.on("kanban/card/create", async (payload = {}) => {
    const responseEvent = "kanban/card/create-response";
    try {
      const companyId = validateAccess(socket);
      const card = await kanbanServices.createCard(
        companyId,
        payload.cardData || {},
        {
          userId: socket.userId,
          role: socket.role,
        }
      );

      socket.emit(responseEvent, { done: true, data: card });
      socket
        .to(`company_${companyId}`)
        .emit("kanban/card/created", { card, meta: { actor: socket.userId } });
    } catch (error) {
      respondWithError(socket, responseEvent, error);
    }
  });

  socket.on("kanban/card/update", async (payload = {}) => {
    const responseEvent = "kanban/card/update-response";
    try {
      const companyId = validateAccess(socket);
      const card = await kanbanServices.updateCard(
        companyId,
        payload.cardId,
        payload.cardData || {},
        {
          userId: socket.userId,
          role: socket.role,
        }
      );

      socket.emit(responseEvent, { done: true, data: card });
      socket
        .to(`company_${companyId}`)
        .emit("kanban/card/updated", { card, meta: { actor: socket.userId } });
    } catch (error) {
      respondWithError(socket, responseEvent, error);
    }
  });

  socket.on("kanban/card/delete", async (payload = {}) => {
    const responseEvent = "kanban/card/delete-response";
    try {
      const companyId = validateAccess(socket);
      const result = await kanbanServices.deleteCard(companyId, payload.cardId);

      socket.emit(responseEvent, { done: true, data: result });
      socket
        .to(`company_${companyId}`)
        .emit("kanban/card/deleted", {
          cardId: payload.cardId,
          meta: { actor: socket.userId },
        });
    } catch (error) {
      respondWithError(socket, responseEvent, error);
    }
  });
};

export default kanbanController;

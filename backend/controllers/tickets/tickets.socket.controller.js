import * as ticketsService from '../../services/tickets/tickets.services.js';

const ticketsSocketController = (socket, io) => {
  console.log('Attaching tickets socket controller...');

  // Get tickets dashboard statistics
  socket.on('tickets/dashboard/get-stats', async (data) => {
    try {
      const result = await ticketsService.getTicketsStats(socket.companyId);
      socket.emit('tickets/dashboard/get-stats-response', result);
    } catch (error) {
      console.error('Error getting tickets stats:', error);
      socket.emit('tickets/dashboard/get-stats-response', {
        done: false,
        error: error.message
      });
    }
  });

  // Get tickets list
  socket.on('tickets/list/get-tickets', async (data) => {
    try {
      const result = await ticketsService.getTicketsList(socket.companyId, data);
      socket.emit('tickets/list/get-tickets-response', result);
    } catch (error) {
      console.error('Error getting tickets list:', error);
      socket.emit('tickets/list/get-tickets-response', {
        done: false,
        error: error.message
      });
    }
  });

  // Get single ticket details
  socket.on('tickets/details/get-ticket', async (data) => {
    try {
      const { ticketId } = data;
      const result = await ticketsService.getTicketDetails(socket.companyId, ticketId);
      socket.emit('tickets/details/get-ticket-response', result);
    } catch (error) {
      console.error('Error getting ticket details:', error);
      socket.emit('tickets/details/get-ticket-response', {
        done: false,
        error: error.message
      });
    }
  });

  // Create new ticket
  socket.on('tickets/create-ticket', async (data) => {
    try {
      console.log('Creating ticket with data:', data);
      console.log('Company ID:', socket.companyId);
      
      const result = await ticketsService.createTicket(socket.companyId, data);
      console.log('Create ticket result:', result);
      
      if (result.done) {
        // Broadcast to all connected clients in the company room
        const companyRoom = `company_${socket.companyId}`;
        console.log('📡 Broadcasting ticket-created event to company room:', companyRoom);
        io.to(companyRoom).emit('tickets/ticket-created', result);
        console.log('✅ Ticket-created event broadcasted successfully');
      }

      socket.emit('tickets/create-ticket-response', result);
    } catch (error) {
      console.error('Error creating ticket:', error);
      socket.emit('tickets/create-ticket-response', {
        done: false,
        error: error.message
      });
    }
  });

  // Update ticket
  socket.on('tickets/update-ticket', async (data) => {
    try {
      console.log('🔄 UPDATE TICKET REQUEST RECEIVED:');
      console.log('📦 Data received:', JSON.stringify(data, null, 2));
      console.log('🏢 Company ID:', socket.companyId);
      
      const { ticketId, updateData } = data;
      console.log('🎫 Ticket ID:', ticketId);
      console.log('📝 Update Data:', JSON.stringify(updateData, null, 2));
      
      const result = await ticketsService.updateTicket(socket.companyId, ticketId, updateData);
      console.log('✅ Update result:', JSON.stringify(result, null, 2));
      
      if (result.done) {
        // Broadcast to all connected clients in the company room
        const companyRoom = `company_${socket.companyId}`;
        console.log('📡 Broadcasting ticket-updated event to company room:', companyRoom);
        io.to(companyRoom).emit('tickets/ticket-updated', result);
        console.log('✅ Ticket-updated event broadcasted successfully');
      }

      socket.emit('tickets/update-ticket-response', result);
      console.log('📤 Sent response to client');
    } catch (error) {
      console.error('❌ Error updating ticket:', error);
      socket.emit('tickets/update-ticket-response', {
        done: false,
        error: error.message
      });
    }
  });

  // Add comment to ticket
  socket.on('tickets/add-comment', async (data) => {
    try {
      const { ticketId, text, author, isInternal = false, attachments = [] } = data;
      const commentData = { text, author, isInternal, attachments };
      const result = await ticketsService.addComment(socket.companyId, ticketId, commentData);
      
      if (result.done) {
        // Broadcast to all connected clients in the company room
        const companyRoom = `company_${socket.companyId}`;
        io.to(companyRoom).emit('tickets/ticket-comment-added', result);
      }

      socket.emit('tickets/add-comment-response', result);
    } catch (error) {
      console.error('Error adding comment:', error);
      socket.emit('tickets/add-comment-response', {
        done: false,
        error: error.message
      });
    }
  });

  // Delete ticket
  socket.on('tickets/delete-ticket', async (data) => {
    try {
      const { ticketId } = data;
      const result = await ticketsService.deleteTicket(socket.companyId, ticketId);
      
      if (result.done) {
        // Broadcast to all connected clients in the company room
        const companyRoom = `company_${socket.companyId}`;
        console.log('📡 Broadcasting ticket-deleted event to company room:', companyRoom);
        io.to(companyRoom).emit('tickets/ticket-deleted', {
          done: true,
          ticketId: ticketId
        });
        console.log('✅ Ticket-deleted event broadcasted successfully');
      }

      socket.emit('tickets/delete-ticket-response', result);
    } catch (error) {
      console.error('Error deleting ticket:', error);
      socket.emit('tickets/delete-ticket-response', {
        done: false,
        error: error.message
      });
    }
  });

  // Bulk delete tickets
  socket.on('tickets/bulk-delete-tickets', async (data) => {
    try {
      const { ticketIds } = data;
      const result = await ticketsService.bulkDeleteTickets(socket.companyId, ticketIds);
      
      if (result.done) {
        // Broadcast to all connected clients in the company room
        const companyRoom = `company_${socket.companyId}`;
        io.to(companyRoom).emit('tickets/tickets-bulk-deleted', result);
      }

      socket.emit('tickets/bulk-delete-tickets-response', result);
    } catch (error) {
      console.error('Error bulk deleting tickets:', error);
      socket.emit('tickets/bulk-delete-tickets-response', {
        done: false,
        error: error.message
      });
    }
  });
};

export default ticketsSocketController;

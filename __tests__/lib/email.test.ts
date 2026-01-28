describe('email lib', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Clear SMTP config by default
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.EMAIL_FROM;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('sendPasswordResetEmail', () => {
    it('should log to console when SMTP is not configured', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const { sendPasswordResetEmail } = require('@/lib/email');
      
      await sendPasswordResetEmail('test@example.com', 'https://example.com/reset?token=abc123');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[DEV] Password reset requested for test@example.com'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('https://example.com/reset?token=abc123'));
      
      consoleSpy.mockRestore();
    });

    it('should send email when SMTP is configured', async () => {
      // Set SMTP environment variables BEFORE importing
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASSWORD = 'password123';
      process.env.SMTP_PORT = '587';
      process.env.EMAIL_FROM = 'noreply@codecomp.com';
      
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      const mockCreateTransport = jest.fn().mockReturnValue({
        sendMail: mockSendMail,
      });
      
      // Mock nodemailer before requiring email module
      jest.doMock('nodemailer', () => ({
        createTransport: mockCreateTransport,
      }));
      
      // Now require the email module - it will use the mocked nodemailer
      const { sendPasswordResetEmail } = require('@/lib/email');
      
      await sendPasswordResetEmail('user@example.com', 'https://codecomp.com/reset?token=xyz789');
      
      expect(mockCreateTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'password123',
        },
      });
      
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@codecomp.com',
          to: 'user@example.com',
          subject: 'Reset Your CodeComp Password',
          html: expect.stringContaining('https://codecomp.com/reset?token=xyz789'),
        })
      );
    });

    it('should use secure connection when SMTP_SECURE is true', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASSWORD = 'password123';
      process.env.SMTP_PORT = '465';
      process.env.SMTP_SECURE = 'true';
      
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      const mockCreateTransport = jest.fn().mockReturnValue({
        sendMail: mockSendMail,
      });
      
      jest.doMock('nodemailer', () => ({
        createTransport: mockCreateTransport,
      }));
      
      require('@/lib/email');
      
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          secure: true,
        })
      );
    });

    it('should handle email sending errors gracefully without throwing', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASSWORD = 'password123';
      
      const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP connection failed'));
      const mockCreateTransport = jest.fn().mockReturnValue({
        sendMail: mockSendMail,
      });
      
      jest.doMock('nodemailer', () => ({
        createTransport: mockCreateTransport,
      }));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { sendPasswordResetEmail } = require('@/lib/email');
      
      // Should not throw - errors are caught internally for security
      await expect(sendPasswordResetEmail('user@example.com', 'https://codecomp.com/reset'))
        .resolves.toBeUndefined();
      
      // But should log the error
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send password reset email:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should use default from email when EMAIL_FROM is not set', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASSWORD = 'password123';
      // EMAIL_FROM intentionally not set
      
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      const mockCreateTransport = jest.fn().mockReturnValue({
        sendMail: mockSendMail,
      });
      
      jest.doMock('nodemailer', () => ({
        createTransport: mockCreateTransport,
      }));
      
      const { sendPasswordResetEmail } = require('@/lib/email');
      
      await sendPasswordResetEmail('user@example.com', 'https://codecomp.com/reset');
      
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@codecomp.com',
        })
      );
    });

    it('should use default SMTP port 587 when SMTP_PORT is not set', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASSWORD = 'password123';
      // SMTP_PORT intentionally not set
      
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      const mockCreateTransport = jest.fn().mockReturnValue({
        sendMail: mockSendMail,
      });
      
      jest.doMock('nodemailer', () => ({
        createTransport: mockCreateTransport,
      }));
      
      require('@/lib/email');
      
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 587,
        })
      );
    });

    it('should include reset link in email HTML', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASSWORD = 'password123';
      
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      const mockCreateTransport = jest.fn().mockReturnValue({
        sendMail: mockSendMail,
      });
      
      jest.doMock('nodemailer', () => ({
        createTransport: mockCreateTransport,
      }));
      
      const { sendPasswordResetEmail } = require('@/lib/email');
      const testResetUrl = 'https://codecomp.com/reset?token=unique-token-123';
      
      await sendPasswordResetEmail('user@example.com', testResetUrl);
      
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain(testResetUrl);
      expect(emailCall.html).toContain('Reset Password');
    });
  });
});

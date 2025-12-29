  app.post("/api/accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      const account = await storage.createAccount({
        ...req.body,
        userId,
        startDate: new Date(req.body.startDate),
        expirationDate: new Date(req.body.expirationDate),
      });

      res.json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

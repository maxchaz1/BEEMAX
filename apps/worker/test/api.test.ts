  it("supports the public sports catalog route", async () => {
    expect(await (await market("/api/sports")).json()).toMatchObject({
      items: [],
    });
  });

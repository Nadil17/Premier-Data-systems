The part request, engineer estimate, and customer estimate data should all stay synchronized.
For example, an engineer initially creates an estimate containing parts A, B, and C.
Later, when creating the customer estimate, an additional part D is added.
So the final list becomes A, B, C, D.

If the customer approves only B, C, and D, then:

The engineer should submit a part request for D (because it was added later and not yet requested).

The system should also remove part A from the engineer’s part request since the customer did not approve it.

How can I implement this logic? I don’t have any ideas about where to start.


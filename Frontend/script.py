path = r'c:\Users\Nadil\Desktop\Premier Data Systems\Frontend\src\pages\jobs\JobDetail.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'const handleReturnJobItem' in line:
        new_lines.append('''
  const getUnrequestedApprovedParts = () => {
    const unrequested: { part_id: number; quantity: number }[] = [];

    customerEstimates
      .filter((e) => e.approval_status === 'approved' || e.approval_status === 'partially_approved')
      .forEach((estimate) => {
        const approvedParts = estimate.items.filter(
          (item) => item.approval_status === 'approved' && item.item_type === 'part' && item.part_id
        );

        approvedParts.forEach((item) => {
          const hasBeenRequested = partsRequests.some((req) =>
            req.items.some(
              (reqItem) =>
                reqItem.part_name?.toLowerCase().includes(item.description.toLowerCase()) ||
                item.description.toLowerCase().includes(reqItem.part_name?.toLowerCase() || '')
            )
          );

          if (!hasBeenRequested && item.part_id) {
            unrequested.push({
              part_id: item.part_id,
              quantity: item.quantity,
            });
          }
        });
      });

    return unrequested;
  };
''')
    new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

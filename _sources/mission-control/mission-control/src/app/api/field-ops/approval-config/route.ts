import { NextResponse } from "next/server";
import { getApprovalConfig, mutateApprovalConfig } from "@/lib/data";
import { approvalConfigUpdateSchema, validateBody } from "@/lib/validations";
import { addFieldActivityEvent } from "@/lib/field-ops-activity";
import { requireOwner } from "@/lib/owner-guard";

// ─── API Routes ─────────────────────────────────────────────────────────────

export async function GET() {
  const data = await getApprovalConfig();
  return NextResponse.json({ data: data.config, config: data.config });
}

export async function PUT(request: Request) {
  const validation = await validateBody(request, approvalConfigUpdateSchema);
  if (!validation.success) return validation.error;
  const body = validation.data;

  const ownerCheck = await requireOwner(body as Record<string, unknown>);
  if (ownerCheck) return ownerCheck;

  const result = await mutateApprovalConfig(async (data) => {
    const oldConfig = { ...data.config, overrides: { ...data.config.overrides } };

    // Merge update into existing config (don't replace entirely)
    if (body.mode !== undefined) {
      data.config.mode = body.mode;
    }
    if (body.overrides !== undefined) {
      data.config.overrides = {
        ...data.config.overrides,
        ...body.overrides,
      };
    }

    return { updatedConfig: data.config, oldConfig };
  });

  const { updatedConfig, oldConfig } = result;

  // Log autonomy_changed event when mode changes (best-effort)
  if (body.mode !== undefined && updatedConfig.mode !== oldConfig.mode) {
    await addFieldActivityEvent({
      type: "autonomy_changed",
      actor: "system",
      taskId: null,
      serviceId: null,
      summary: `Approval mode changed to "${updatedConfig.mode}"`,
      details: `Global approval mode changed from "${oldConfig.mode}" to "${updatedConfig.mode}".`,
    });
  }

  return NextResponse.json({ data: updatedConfig, config: updatedConfig });
}

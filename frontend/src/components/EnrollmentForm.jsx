// Add reminder configuration section
<div className="space-y-4">
  <h3 className="text-lg font-medium">Daily Assessment Reminders</h3>
  
  <div className="flex items-center">
    <input
      type="checkbox"
      id="enableReminders"
      checked={reminderSettings.dailyAssessment}
      onChange={(e) => setReminderSettings({
        ...reminderSettings,
        dailyAssessment: e.target.checked
      })}
    />
    <label htmlFor="enableReminders" className="ml-2">
      Enable daily pain assessment reminders
    </label>
  </div>

  {reminderSettings.dailyAssessment && (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Reminder Time
        </label>
        <input
          type="time"
          value={reminderSettings.reminderTime}
          onChange={(e) => setReminderSettings({
            ...reminderSettings,
            reminderTime: e.target.value
          })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Notification Methods
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={reminderSettings.methods.includes('email')}
              onChange={(e) => handleMethodChange('email', e.target.checked)}
            />
            <span className="ml-2">Email</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={reminderSettings.methods.includes('sms')}
              onChange={(e) => handleMethodChange('sms', e.target.checked)}
            />
            <span className="ml-2">SMS</span>
          </label>
        </div>
      </div>
    </>
  )}
</div>
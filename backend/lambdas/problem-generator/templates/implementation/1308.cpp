// BOJ - 1308 D-Day
#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;

int days[13] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
struct date {
    int y, m, d;
};
int lunar(int y1, int y2) {
    if(y1 > y2) return 0;
    int cnt = 0;
    loop(y, y1, y2) {
        if(y % 400 == 0) cnt++;
        else if(y % 100 != 0 && y % 4 == 0) cnt++;
    }
    return cnt;
}
int get_days(int y, int m) {
    return days[m] + (m == 2 && lunar(y, y));
}
int diff(date d1, date d2) {
    if(d1.y < d2.y)
        return diff(d1, {d1.y, 12, 31}) + 365 * (d2.y - d1.y - 1) + lunar(d1.y + 1, d2.y - 1) + diff({d2.y, 1, 1}, d2);
    int ret = 0;
    loop(m, d1.m, d2.m) ret = ret + get_days(d1.y, m);
    ret -= (d1.d - 1);
    ret -= (get_days(d2.y, d2.m) - d2.d);
    return ret;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int y1, m1, d1, y2, m2, d2; cin >> y1 >> m1 >> d1 >> y2 >> m2 >> d2;
    int calc = diff(date {y1, m1, d1}, date {y2, m2, d2}) - 1;
    if(y1 + 1000 < y2) cout << "gg\n";
    else if(y1 + 1000 < y2 || (y1 + 1000 == y2 && m1 < m2) || (y1 + 1000 == y2 && m1 == m2 && d1 <= d2)) cout << "gg\n";
    else cout << "D-" << calc << '\n';
}
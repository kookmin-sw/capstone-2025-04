// BOJ - 4587 이집트 분수

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
#define DEBUG false
 
using namespace std;
ll m, n, m0, n0;
struct p {
    ll denom, m, n;
};
ll gcd(ll a, ll b) {
    if(a == 0) return 1;
    return !b ? a : gcd(b, a % b);
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    while(1) {
        cin >> m >> n;
    // for(m0 = 2, n0 = 3; !(m0 == 98 && n0 == 99); (m0 + 1 == n0 ? m0 = 2, n0 += 1 : m0++)) {
    //     cout << "EXECUTING: " << m0 << ' ' << n0 << '\n'; m = m0, n = n0;

        if(DEBUG) m0 = m, n0 = n;
        if(!m && !n) return 0;

        vector<p> history;
        while(1) {
            ll k;
            if(history.empty()) k = (n + m - 1) / m;
            else {
                k = history.back().denom + 1;
                m = history.back().m, n = history.back().n;
                history.pop_back();
            }
            while(k < 1000000) {
                // m/n - 1/k > 0 이어야 뺄 수 있다.
                ll num = (m * k - n) / gcd(m * k - n, n * k), denom = n * k / gcd(m * k - n, n * k);
                if(m * k - n < 0) continue;
                if(num != 0 && denom >= 1000000) { k++; continue; }
                history.push_back({k, num, denom});
                m = num, n = denom; if(!m) goto end;
                k = (n + m - 1) / m;
            }
        }
        end:;

        for(p t : history) cout << t.denom << ' ';
        cout << '\n';
        if(DEBUG) for(p t : history) cout << 1 << '/' << t.denom << " + ";
        if(DEBUG) cout << "0 = " << m0 << '/' << n0 << '\n';
    }
}
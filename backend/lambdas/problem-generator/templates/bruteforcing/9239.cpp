// BOJ - 9239 스티브 잡숭

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
ll e10[8] = {1, 10, 100, 1000, 10000, 100000, 1000000, 10000000};
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    double m; cin >> m; m *= 10000;
    ll M = m; // M = 10000m

    ll no_sol = 1;
    if(M < 100000) loop(n, 0, 7) loop(p0, 1, 9) {
        ll x = (10000 * p0 * (10 * e10[n] - 1)) / (100000 - M);
        ll y = 10 * (x - p0 * e10[n]) + p0;

        if(to_string(y).size() == n + 1 && x * (100000 - M) == 10000 * p0 * (10 * e10[n] - 1)) {
            cout << x << '\n'; no_sol = 0;
        }
    }

    if(no_sol) cout << "No solution\n";
}